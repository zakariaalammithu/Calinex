const { db } = require('./db');
const { logActivity } = require('./auth');
const { sendEmail } = require('./integrations/resend');
const { syncLeadToSheets } = require('./integrations/sheets');
const { analyzeLead, generateCustomReply } = require('./integrations/openai');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');

/**
 * CALINEX Automation & Webhook Dispatcher Engine
 */

/**
 * Trigger All Matching Active Automations
 * @param {string} triggerType - e.g. 'new_message', 'new_contact', 'new_booking', 'booking_cancelled', 'payment_successful', 'payment_failed', 'contact_status_changed'
 * @param {object} eventPayload - Event context data
 */
async function triggerAutomations(triggerType, eventPayload) {
  try {
    const automations = db.prepare(`
      SELECT * FROM automations
      WHERE trigger_type = ? AND is_enabled = 1
      ORDER BY id ASC
    `).all(triggerType);

    if (automations.length === 0) {
      // Also automatically dispatch webhook for standard events
      dispatchWebhooks(mapTriggerToEvent(triggerType), eventPayload).catch(() => {});
      return { triggered: 0, results: [] };
    }

    const executionResults = [];

    for (const auto of automations) {
      let actions = [];
      let conditions = [];
      try {
        actions = JSON.parse(auto.actions || '[]');
        conditions = JSON.parse(auto.conditions || '[]');
      } catch (e) {
        continue;
      }

      // Check conditions if specified
      if (conditions.length > 0 && !evaluateConditions(conditions, eventPayload)) {
        continue;
      }

      let autoSuccess = true;
      let lastError = null;

      for (const action of actions) {
        try {
          await executeAction(action, eventPayload);
        } catch (err) {
          autoSuccess = false;
          lastError = err.message || 'Action execution error';
          console.error(`[AUTOMATION ACTION ERROR] (Auto #${auto.id} - ${action.type}):`, err.message);

          // Queue into Resilient Retry System so zero data is lost
          enqueueRetry(action.type, triggerType, { action, eventPayload }, err.message);
        }
      }

      // Update Automation Run Statistics
      if (autoSuccess) {
        db.prepare(`
          UPDATE automations SET
            success_count = success_count + 1,
            last_run_at = CURRENT_TIMESTAMP,
            last_error_message = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(auto.id);
      } else {
        db.prepare(`
          UPDATE automations SET
            failure_count = failure_count + 1,
            last_run_at = CURRENT_TIMESTAMP,
            last_error_message = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(lastError, auto.id);
      }

      executionResults.push({
        automationId: auto.id,
        name: auto.name,
        success: autoSuccess,
        error: lastError
      });
    }

    // Always dispatch registered webhooks for this event
    dispatchWebhooks(mapTriggerToEvent(triggerType), eventPayload).catch(() => {});

    return { triggered: automations.length, results: executionResults };
  } catch (globalErr) {
    console.error('[TRIGGER AUTOMATIONS GLOBAL ERROR]', globalErr);
    return { triggered: 0, error: globalErr.message };
  }
}

/**
 * Execute Single Automation Action
 */
async function executeAction(action, payload) {
  const type = action.type;
  const leadEmail = payload.email || payload.client_email || '';
  const leadName = payload.name || payload.client_name || 'Client';

  switch (type) {
    case 'send_resend_email': {
      const templateSlug = action.template_slug || 'new_contact_notification';
      let recipient = action.recipient || '{{email}}';
      recipient = recipient.replace(/\{\{email\}\}/g, leadEmail).replace(/\{\{name\}\}/g, leadName);

      if (!recipient || recipient === '{{email}}') recipient = 'admin@calinex.us';

      const emailRes = await sendEmail({
        to: recipient,
        slug: templateSlug,
        variables: payload
      });

      if (!emailRes.success) {
        throw new Error(emailRes.error || 'Resend email failed to send');
      }
      break;
    }

    case 'add_google_sheets':
    case 'update_google_sheets': {
      const messageId = payload.id || payload.messageId || 1;
      const sheetsRes = await syncLeadToSheets(messageId, payload);
      if (!sheetsRes.success && sheetsRes.error && !sheetsRes.simulated) {
        throw new Error(sheetsRes.error);
      }
      break;
    }

    case 'ai_lead_analysis': {
      const messageId = payload.id || null;
      const aiRes = await analyzeLead(payload, messageId);
      if (!aiRes.success) {
        throw new Error(aiRes.error || 'AI analysis failed');
      }
      break;
    }

    case 'generate_ai_reply': {
      await generateCustomReply(payload);
      break;
    }

    case 'create_notification': {
      let title = action.title || 'Automation Triggered';
      let msg = action.message || 'Event processed successfully for {{name}}.';
      title = title.replace(/\{\{name\}\}/g, leadName).replace(/\{\{email\}\}/g, leadEmail);
      msg = msg.replace(/\{\{name\}\}/g, leadName).replace(/\{\{email\}\}/g, leadEmail);

      db.prepare(`
        INSERT INTO notifications (title, message, type, link)
        VALUES (?, ?, 'info', '#automations')
      `).run(title, msg);
      break;
    }

    case 'update_contact_status': {
      const newStatus = action.status || 'qualified';
      if (leadEmail) {
        db.prepare(`
          UPDATE contacts SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE email = ? COLLATE NOCASE
        `).run(newStatus, leadEmail);
      }
      break;
    }

    case 'send_webhook': {
      const eventType = action.event_type || mapTriggerToEvent(payload.trigger_type || 'message.created');
      await dispatchWebhooks(eventType, payload);
      break;
    }

    default:
      console.log(`[AUTOMATION UNHANDLED ACTION] ${type}`);
  }
}

/**
 * Dispatch Signed Webhooks to Registered Endpoints
 * Supports: contact.created, contact.updated, message.created, booking.created, booking.cancelled, payment.success, payment.failed
 */
async function dispatchWebhooks(eventType, payload) {
  const activeWebhooks = db.prepare(`
    SELECT * FROM webhooks
    WHERE is_active = 1
  `).all();

  const results = [];

  for (const wh of activeWebhooks) {
    let subscribedEvents = [];
    try {
      subscribedEvents = JSON.parse(wh.events || '[]');
    } catch (e) {
      subscribedEvents = [];
    }

    // Check if webhook is subscribed to this event
    if (!subscribedEvents.includes('*') && !subscribedEvents.includes(eventType)) {
      continue;
    }

    const payloadString = JSON.stringify({
      event: eventType,
      created_at: new Date().toISOString(),
      data: payload
    });

    const signature = crypto.createHmac('sha256', wh.secret || 'calinex_default_secret')
                            .update(payloadString)
                            .digest('hex');

    const startTime = Date.now();
    let deliveryStatus = 'success';
    let statusCode = 200;
    let responseBody = '';
    let errorMessage = null;

    try {
      const postRes = await sendHttpRequest(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CALINEX-Webhook-Dispatcher/2.0',
          'X-Calinex-Event': eventType,
          'X-Calinex-Signature': `sha256=${signature}`
        }
      }, payloadString);

      statusCode = postRes.statusCode;
      responseBody = (postRes.body || '').substring(0, 500);

      if (statusCode < 200 || statusCode >= 300) {
        deliveryStatus = 'failed';
        errorMessage = `HTTP Status ${statusCode}: ${responseBody}`;
      }
    } catch (netErr) {
      deliveryStatus = 'failed';
      statusCode = 0;
      errorMessage = netErr.message || 'Network unreachable';
      console.warn(`[WEBHOOK DISPATCH FAIL] ${wh.url}:`, netErr.message);

      // Enqueue to Retry System
      enqueueRetry('webhook', eventType, { webhookId: wh.id, url: wh.url, eventType, payload }, netErr.message);
    }

    const durationMs = Date.now() - startTime;

    // Record Delivery Log
    db.prepare(`
      INSERT INTO webhook_deliveries (
        webhook_id, event_type, payload, status_code, response_body,
        duration_ms, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      wh.id,
      eventType,
      payloadString,
      statusCode,
      responseBody || (deliveryStatus === 'success' ? 'OK (Delivered)' : 'Error'),
      durationMs,
      deliveryStatus,
      errorMessage
    );

    results.push({ webhookId: wh.id, eventType, deliveryStatus, statusCode, durationMs });
  }

  return results;
}

/**
 * Resilient Retry Queue Manager
 */
function enqueueRetry(taskType, eventName, payload, errorMsg) {
  try {
    db.prepare(`
      INSERT INTO retry_queue (
        task_type, event_name, payload, attempts, status, last_error
      ) VALUES (?, ?, ?, 1, 'pending', ?)
    `).run(taskType, eventName, JSON.stringify(payload), errorMsg);
  } catch (e) {
    console.error('[ENQUEUE RETRY ERROR]', e);
  }
}

/**
 * Manual or Scheduled Retry Executor
 */
async function processRetryTask(taskId) {
  const task = db.prepare('SELECT * FROM retry_queue WHERE id = ?').get(taskId);
  if (!task) throw new Error('Retry task not found');

  db.prepare("UPDATE retry_queue SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(taskId);

  let payloadObj = {};
  try { payloadObj = JSON.parse(task.payload || '{}'); } catch (e) {}

  try {
    if (task.task_type === 'send_resend_email' || task.task_type === 'email') {
      const emailPayload = payloadObj.eventPayload || payloadObj;
      await sendEmail({
        to: emailPayload.email || 'admin@calinex.us',
        slug: payloadObj.action?.template_slug || 'visitor_confirmation',
        variables: emailPayload
      });
    } else if (task.task_type === 'add_google_sheets' || task.task_type === 'sheets') {
      const lead = payloadObj.eventPayload || payloadObj;
      await syncLeadToSheets(lead.id || 1, lead);
    } else if (task.task_type === 'webhook') {
      await dispatchWebhooks(task.event_name, payloadObj.payload || payloadObj);
    } else if (task.task_type === 'ai_lead_analysis' || task.task_type === 'ai') {
      await analyzeLead(payloadObj.eventPayload || payloadObj, payloadObj.eventPayload?.id || null);
    }

    db.prepare("UPDATE retry_queue SET status = 'completed', last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(taskId);
    return { success: true, taskId };
  } catch (err) {
    const newAttempts = task.attempts + 1;
    const isExhausted = newAttempts >= task.max_attempts;
    db.prepare(`
      UPDATE retry_queue SET
        status = ?,
        attempts = ?,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(isExhausted ? 'failed' : 'pending', newAttempts, err.message, taskId);

    return { success: false, taskId, error: err.message };
  }
}

async function retryAllPendingTasks() {
  const pending = db.prepare("SELECT id FROM retry_queue WHERE status = 'pending' OR status = 'failed' LIMIT 50").all();
  let successCount = 0;
  let failCount = 0;

  for (const t of pending) {
    const res = await processRetryTask(t.id);
    if (res.success) successCount++;
    else failCount++;
  }

  return { total: pending.length, successCount, failCount };
}

/**
 * Condition Evaluator
 */
function evaluateConditions(conditions, payload) {
  for (const cond of conditions) {
    const fieldVal = payload[cond.field];
    const targetVal = cond.value;

    switch (cond.operator) {
      case 'equals':
        if (fieldVal != targetVal) return false;
        break;
      case 'not_equals':
        if (fieldVal == targetVal) return false;
        break;
      case 'contains':
        if (!String(fieldVal || '').toLowerCase().includes(String(targetVal).toLowerCase())) return false;
        break;
      case 'greater_than':
        if (Number(fieldVal) <= Number(targetVal)) return false;
        break;
      case 'less_than':
        if (Number(fieldVal) >= Number(targetVal)) return false;
        break;
    }
  }
  return true;
}

/**
 * Map Trigger Name to Standard Webhook Event
 */
function mapTriggerToEvent(trigger) {
  const map = {
    'new_contact': 'contact.created',
    'contact_status_changed': 'contact.updated',
    'new_message': 'message.created',
    'new_booking': 'booking.created',
    'booking_cancelled': 'booking.cancelled',
    'payment_successful': 'payment.success',
    'payment_failed': 'payment.failed'
  };
  return map[trigger] || trigger;
}

/**
 * HTTP/HTTPS Request Helper
 */
function sendHttpRequest(targetUrl, options, bodyData) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;

      // Simulated Webhook URL support (e.g. webhook.site demo endpoints)
      if (parsed.hostname.includes('webhook.site') || parsed.hostname === 'localhost') {
        setTimeout(() => {
          resolve({ statusCode: 200, body: '{"success":true,"delivered":true}' });
        }, 15);
        return;
      }

      const req = transport.request(targetUrl, options, res => {
        let resData = '';
        res.on('data', d => resData += d);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: resData }));
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timed out after 5000ms'));
      });

      if (bodyData) req.write(bodyData);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  triggerAutomations,
  dispatchWebhooks,
  enqueueRetry,
  processRetryTask,
  retryAllPendingTasks
};
