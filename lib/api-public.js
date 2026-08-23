function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch(e) { return resolve({}); }
    }

    let bodyStr = '';
    let resolved = false;

    req.on('data', chunk => {
      bodyStr += chunk;
    });

    req.on('end', () => {
      if (resolved) return;
      resolved = true;
      try {
        resolve(JSON.parse(bodyStr || '{}'));
      } catch (e) {
        resolve({});
      }
    });

    req.on('error', () => {
      if (resolved) return;
      resolved = true;
      resolve({});
    });

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try {
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch (e) {
        resolve({});
      }
    }, 300);
  });
}

const { db } = require('./db');
const { logActivity } = require('./auth');
const { sendEmail } = require('./integrations/resend');
const { syncLeadToSheets } = require('./integrations/sheets');
const { processCalcomWebhook } = require('./integrations/calcom');
const { analyzeLead } = require('./integrations/openai');
const { handleStripeWebhook } = require('./integrations/stripe');
const { triggerAutomations, dispatchWebhooks } = require('./automations');

// Rate limiting storage in memory (IP -> { count, resetTime })
const ipRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Handle Public APIs & Webhooks
 */
async function handlePublicApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  if (pathname === '/api/public/submit-form' && req.method === 'POST') {
    return handleFormSubmit(req, res, url);
  }

  if (pathname === '/api/public/webhooks/cal' && req.method === 'POST') {
    return handleCalWebhook(req, res);
  }

  if (pathname === '/api/public/webhooks/stripe' && req.method === 'POST') {
    return handleStripeWebhookEndpoint(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
}

/**
 * Stripe Webhook Handler
 */
async function handleStripeWebhookEndpoint(req, res) {
  let bodyStr = '';
  req.on('data', chunk => bodyStr += chunk);
  req.on('end', async () => {
    try {
      const signature = req.headers['stripe-signature'] || '';
      const result = await handleStripeWebhook(bodyStr, signature);

      if (result.success) {
        let event = {};
        try { event = JSON.parse(bodyStr); } catch (e) {}
        const eventType = event.type || 'checkout.session.completed';

        if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
          triggerAutomations('payment_successful', event.data?.object || event).catch(() => {});
        } else if (eventType === 'payment_intent.payment_failed') {
          triggerAutomations('payment_failed', event.data?.object || event).catch(() => {});
        }
      }

      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[STRIPE WEBHOOK ERROR]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

/**
 * Cal.com Webhook Handler
 */
async function handleCalWebhook(req, res) {
  let bodyStr = '';
  req.on('data', chunk => bodyStr += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(bodyStr || '{}');
      const result = await processCalcomWebhook(payload);

      if (result.success) {
        const trigger = payload.triggerEvent === 'BOOKING_CANCELLED' ? 'booking_cancelled' : 'new_booking';
        triggerAutomations(trigger, payload.payload || payload).catch(() => {});
      }

      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

/**
 * Process Form Submission
 */
async function handleFormSubmit(req, res, url) {
  let bodyStr = '';
  req.on('data', chunk => bodyStr += chunk);
  req.on('end', async () => {
    try {
      // 1. Rate Limiting Check
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const now = Date.now();

      const rateData = ipRateLimits.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
      if (now > rateData.resetTime) {
        rateData.count = 0;
        rateData.resetTime = now + RATE_LIMIT_WINDOW_MS;
      }

      if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Too many requests. Please try again in a few minutes.' }));
        return;
      }

      rateData.count++;
      ipRateLimits.set(clientIp, rateData);

      // 2. Parse Request Body
      let data = {};
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try { data = JSON.parse(bodyStr || '{}'); } catch(e) { data = {}; }
      } else {
        const params = new URLSearchParams(bodyStr);
        for (const [key, val] of params.entries()) {
          data[key] = val;
        }
      }

      // 3. Honeypot Spam Check
      const honeypot = data._hp_val || data.website_hp || data._gotcha || data['bot-field'];
      if (honeypot) {
        console.warn(`[SPAM BLOCKED] Honeypot triggered from IP: ${clientIp}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Thank you! Your submission has been received!' }));
        return;
      }

      // 4. Extract and Sanitize Form Values
      console.log('[DEBUG PARSED DATA]', { bodyStr, data });
      const fullName = (data['Full-Name-4'] || data['Full-Name'] || data['name'] || data['fullName'] || '').trim();
      const email = (data['Email-4'] || data['Email'] || data['email'] || '').trim();
      const budget = (data['Project-Budget-4'] || data['budget'] || '').trim();
      const hearAboutUs = (data['Where-you-find-us-2'] || data['source'] || 'Website Contact Form').trim();
      const messageText = (data['text-area-2'] || data['goals'] || data['message'] || data['text-area-pop'] || '').trim();
      const phone = (data['phone'] || data['Phone'] || '').trim();
      const company = (data['company'] || data['Company'] || '').trim();

      // Collect Selected Services
      const selectedServices = [];
      if (Array.isArray(data.services)) {
        selectedServices.push(...data.services);
      } else if (typeof data.services === 'string' && data.services) {
        selectedServices.push(data.services);
      } else {
        const serviceKeys = [
          ['UI-UX-Design-2', 'UI/UX Design'],
          ['SaaS-Design-2', 'SaaS Design'],
          ['Branding-2', 'Branding'],
          ['CRO-2', 'CRO'],
          ['Mobile-app-2', 'Mobile App'],
          ['Development-2', 'Development'],
          ['MVP-Development-2', 'MVP Development'],
          ['Web-Design-2', 'Web Design']
        ];
        for (const [key, label] of serviceKeys) {
          if (data[key] === true || data[key] === 'on' || data[key] === 'true') {
            selectedServices.push(label);
          }
        }
      }

      // 5. Server-Side Validation
      if (!fullName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Please enter your full name.' }));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Please provide a valid email address.' }));
        return;
      }

      // 6. Insert into `messages` Table
      const insertMessage = db.prepare(`
        INSERT INTO messages (
          name, email, phone, budget, message, services, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'New'
        )
      `);

      const messageResult = insertMessage.run(
        fullName,
        email,
        phone || null,
        budget || null,
        messageText || 'Project Discussion Inquiry',
        JSON.stringify(selectedServices)
      );

      const messageId = messageResult.lastInsertRowid;

      // 7. Update or Insert into `contacts` Table
      const existingContact = db.prepare('SELECT id FROM contacts WHERE email = ? COLLATE NOCASE').get(email);

      if (existingContact) {
        db.prepare(`
          UPDATE contacts SET
            name = ?,
            phone = COALESCE(?, phone),
            company = COALESCE(?, company)
          WHERE id = ?
        `).run(fullName, phone || null, company || null, existingContact.id);
      } else {
        db.prepare(`
          INSERT INTO contacts (
            name, email, phone, company, source, status
          ) VALUES (
            ?, ?, ?, ?, ?, 'lead'
          )
        `).run(
          fullName,
          email,
          phone || null,
          company || null,
          hearAboutUs
        );
      }

      // 8. Prepare Payload
      const leadPayload = {
        id: messageId,
        messageId,
        name: fullName,
        email,
        phone: phone || '—',
        company: company || '—',
        budget: budget || 'Not specified',
        service: selectedServices.join(', ') || 'UI/UX Design',
        message: messageText || 'Project Discussion Inquiry',
        source: hearAboutUs,
        created_at: new Date().toISOString()
      };

      // 9. In-App Notification for Admin Dashboard
      try {
        db.prepare(`
          INSERT INTO notifications (title, message, type, link)
          VALUES (?, ?, 'lead', '/admin#leads-messages')
        `).run(
          `🚀 New Inbound Lead: ${fullName}`,
          `Inquiry from ${fullName} (${email}) for ${selectedServices.join(', ') || budget || 'Design Subscription'}`
        );
      } catch (notifErr) {
        console.error('[NOTIF INSERT ERROR]', notifErr);
      }

      // 10. Direct Email Notification to calinexusa@gmail.com & hello@calinex.us
      sendEmail({
        to: [process.env.NOTIFICATION_EMAIL || 'calinexusa@gmail.com'],
        slug: 'new_contact_notification',
        variables: leadPayload
      }).catch(e => console.error('[DIRECT EMAIL NOTIFICATION ERROR]', e));

      // 11. Execute Automation Engine & Webhooks
      triggerAutomations('new_message', leadPayload).catch(e => console.error('[AUTO ENGINE MSG ERROR]', e));

      // 12. Return Success Response
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        message: 'Thank you! Your submission has been received!'
      }));

    } catch (err) {
      console.error('[FORM SUBMIT ERROR]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unable to submit your message right now. Please try again or email us directly at hello@calinex.us'
      }));
    }
  });
}

module.exports = {
  handlePublicApi
};
