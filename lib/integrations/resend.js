function getDb() { return require('../db').db || require('./db').db; }
function getLogActivity() { try { return require('../auth').logActivity || require('./auth').logActivity; } catch(e) { return () => {}; } }

/**
 * Resend Email Integration Engine
 */

/**
 * Get Resend Integration Configuration
 */
function getResendConfig() {
  const row = getDb().prepare("SELECT * FROM integrations WHERE provider = 'resend'").get();
  let dbConfig = {};
  if (row) {
    try { dbConfig = JSON.parse(row.config || '{}'); } catch(e) {}
  }
  
  const apiKey = (process.env.RESEND_API_KEY || dbConfig.api_key || '').trim();
  const fromName = (process.env.RESEND_FROM_NAME || dbConfig.from_name || 'CALINEX Leads').trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || dbConfig.from_email || 'onboarding@resend.dev').trim();
  const replyTo = (process.env.RESEND_REPLY_TO || dbConfig.reply_to || 'hello@calinex.us').trim();

  return {
    status: apiKey ? 'connected' : (row ? row.status : 'disconnected'),
    last_success_at: row ? row.last_success_at : null,
    last_error_at: row ? row.last_error_at : null,
    last_error_message: row ? row.last_error_message : null,
    config: {
      api_key: apiKey,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo
    }
  };
}

/**
 * Render Template HTML with Variables
 */
function renderTemplate(templateHtml, variables = {}) {
  let result = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? String(value) : '');
  }
  return result;
}

/**
 * Send Email via Resend
 */
async function sendEmail({ to, subject, html, text, slug, variables = {} }) {
  const { status, config } = getResendConfig();

  // If a template slug is provided, load from database
  let emailSubject = subject;
  let emailHtml = html;

  if (slug) {
    const tpl = getDb().prepare('SELECT * FROM email_templates WHERE slug = ?').get(slug);
    if (tpl) {
      if (tpl.is_enabled === 0) {
        console.log(`[RESEND] Template ${slug} is disabled. Skipping send.`);
        return { success: true, skipped: true };
      }
      emailSubject = renderTemplate(tpl.subject, variables);
      emailHtml = renderTemplate(tpl.body_html, variables);
    }
  }

  const fromName = config.from_name || 'CALINEX | Md. Sharafat Ullah';
  const fromEmail = config.from_email || 'hello@calinex.us';
  const replyTo = config.reply_to || 'hello@calinex.us';
  const apiKey = config.api_key ? config.api_key.trim() : '';

  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: Array.isArray(to) ? to : [to],
    subject: emailSubject,
    html: emailHtml,
    text: text || '',
    reply_to: replyTo
  };

  // If API key is missing, simulate delivery in test/development mode
  if (!apiKey) {
    console.log(`[RESEND SIMULATION] To: ${to} | Subject: "${emailSubject}"`);
    getDb().prepare(`
      UPDATE integrations SET
        status = 'connected',
        last_success_at = CURRENT_TIMESTAMP,
        last_error_message = NULL
      WHERE provider = 'resend'
    `).run();

    getLogActivity()(null, `Email Dispatched (Simulated): ${emailSubject}`, 'Email', slug || 'custom', '127.0.0.1', 'Resend', `To: ${to}`);
    return { success: true, id: `sim_${Date.now()}`, simulated: true };
  }

  // Live Resend API call
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.id) {
      getDb().prepare(`
        UPDATE integrations SET
          status = 'connected',
          last_success_at = CURRENT_TIMESTAMP,
          last_error_message = NULL
        WHERE provider = 'resend'
      `).run();

      getLogActivity()(null, `Email Delivered via Resend: ${emailSubject}`, 'Email', slug || 'custom', '127.0.0.1', 'Resend', `ID: ${data.id} To: ${to}`);
      return { success: true, id: data.id };
    } else {
      const errMsg = data.message || (data.errors ? JSON.stringify(data.errors) : 'Resend API error');
      getDb().prepare(`
        UPDATE integrations SET
          status = 'error',
          last_error_at = CURRENT_TIMESTAMP,
          last_error_message = ?
        WHERE provider = 'resend'
      `).run(errMsg);

      console.error('[RESEND ERROR]', errMsg);
      return { success: false, error: errMsg };
    }
  } catch (err) {
    const errMsg = err.message || 'Network connection failed to api.resend.com';
    getDb().prepare(`
      UPDATE integrations SET
        status = 'error',
        last_error_at = CURRENT_TIMESTAMP,
        last_error_message = ?
      WHERE provider = 'resend'
    `).run(errMsg);

    console.error('[RESEND EXCEPTION]', err);
    return { success: false, error: errMsg };
  }
}

module.exports = {
  getResendConfig,
  renderTemplate,
  sendEmail
};
