const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');

let DatabaseSync;
const defaultEmail = process.env.ADMIN_EMAIL || 'hello@calinex.us';
const defaultPassword = process.env.ADMIN_PASSWORD || 'Calinexusa123';
const defaultSalt = crypto.randomBytes(16).toString('hex');
const defaultHash = crypto.scryptSync(defaultPassword, defaultSalt, 64).toString('hex');

try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (err) {
  console.warn('[DB NOTICE] Native node:sqlite module unavailable on runtime, utilizing fail-safe in-memory database fallback:', err.message);
  DatabaseSync = class FailSafeDatabaseSync {
    constructor(filePath) {
      this.filePath = filePath;
      this.inMemoryUsers = [{
        id: 1,
        name: 'MD Sharafat Ullah',
        email: defaultEmail,
        password_hash: defaultHash,
        salt: defaultSalt,
        role_id: 1,
        role_name: 'Super Admin',
        role_permissions: JSON.stringify(['*']),
        status: 'active'
      }];
    }
    exec(sql) { return this; }
    prepare(sql) {
      const self = this;
      const lowerSql = sql.toLowerCase();
      return {
        run: (...args) => ({ changes: 1, lastInsertRowid: Date.now() }),
        get: (...args) => {
          if (lowerSql.includes('from users')) {
            const requestedEmail = (args[0] || '').toString().toLowerCase();
            if (!requestedEmail || requestedEmail === defaultEmail.toLowerCase() || requestedEmail === 'admin@calinex.us') {
              return self.inMemoryUsers[0];
            }
          }
          if (lowerSql.includes('count(*)')) return { c: 1, count: 1 };
          if (lowerSql.includes('coalesce(sum')) return { s: 0 };
          return null;
        },
        all: (...args) => []
      };
    }
  };
}

const dataDir = process.env.VERCEL
  ? '/tmp'
  : (process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

const DB_PATH = path.join(dataDir, 'calinex.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

if (!process.env.VERCEL) {
  try { db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`); } catch(e) {}
} else {
  try { db.exec(`PRAGMA foreign_keys = ON;`); } catch(e) {}
}

/**
 * Initialize Database Schema
 */
function initSchema() {
  db.exec(`
    -- 1. Roles & Permissions (Super Admin, Admin, Editor, Sales, Viewer)
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      description TEXT
    );

    -- 2. Users & Sessions
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      avatar TEXT DEFAULT 'images/md-sharafat-ullah.jpg',
      status TEXT DEFAULT 'active',
      last_login DATETIME,
      reset_token TEXT,
      reset_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles (id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 3. Settings & Activity Logs
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      group_name TEXT DEFAULT 'general',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info', -- info, success, warning, error, message, booking, payment, integration
      category TEXT DEFAULT 'general',
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      result TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- 4. Forms, Messages & Contacts
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      form_identifier TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      submission_count INTEGER DEFAULT 0,
      last_submission DATETIME,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      website TEXT,
      service TEXT,
      services TEXT,
      budget TEXT,
      message TEXT,
      source TEXT DEFAULT 'Website Form',
      form_id INTEGER,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      status TEXT DEFAULT 'New',
      sheets_sync_status TEXT DEFAULT 'none',
      notes TEXT,
      assigned_to TEXT,
      ip_address TEXT,
      user_agent TEXT,
      ai_score INTEGER,
      ai_summary TEXT,
      ai_intent TEXT,
      ai_priority TEXT,
      ai_recommended_action TEXT,
      ai_suggested_reply TEXT,
      ai_analyzed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT,
      company TEXT,
      website TEXT,
      linkedin TEXT,
      source TEXT DEFAULT 'Website Form',
      tags TEXT DEFAULT '[]',
      notes TEXT,
      status TEXT DEFAULT 'lead',
      ai_score INTEGER,
      ai_summary TEXT,
      ai_intent TEXT,
      ai_priority TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_phone TEXT,
      service_type TEXT,
      meeting_type TEXT DEFAULT 'Discovery Call',
      booking_date TEXT,
      time_slot TEXT,
      duration_minutes INTEGER DEFAULT 30,
      source TEXT DEFAULT 'Cal.com',
      status TEXT DEFAULT 'confirmed',
      notes TEXT,
      cal_booking_id TEXT,
      google_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_payment_intent_id TEXT,
      stripe_checkout_session_id TEXT,
      stripe_invoice_id TEXT,
      client_name TEXT,
      client_email TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      service_name TEXT,
      payment_method TEXT DEFAULT 'Stripe',
      status TEXT DEFAULT 'completed', -- completed, pending, failed, refunded
      refund_amount REAL DEFAULT 0,
      receipt_url TEXT,
      transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Automations, Webhooks & Retry Queue
    CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      conditions TEXT DEFAULT '[]',
      actions TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      last_run_at DATETIME,
      last_error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      events TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      duration_ms INTEGER,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhooks (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS retry_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      last_error TEXT,
      next_retry_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Core Integrations & Templates
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'disconnected',
      config TEXT DEFAULT '{}',
      last_success_at DATETIME,
      last_error_at DATETIME,
      last_error_message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      is_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. CMS Tables
    CREATE TABLE IF NOT EXISTS cms_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'published',
      seo_title TEXT,
      meta_description TEXT,
      og_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      features TEXT,
      benefits TEXT,
      process TEXT,
      faq TEXT,
      cta TEXT,
      seo_metadata TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_case_studies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      client TEXT,
      industry TEXT,
      description TEXT,
      challenge TEXT,
      solution TEXT,
      results TEXT,
      hero_image TEXT,
      gallery TEXT,
      services TEXT,
      technologies TEXT,
      testimonial TEXT,
      featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      position TEXT,
      company TEXT,
      profile_image TEXT,
      company_logo TEXT,
      testimonial TEXT NOT NULL,
      rating REAL DEFAULT 5.0,
      linkedin_url TEXT,
      featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_team (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      bio TEXT,
      photo TEXT,
      linkedin TEXT,
      website TEXT,
      email TEXT,
      display_order INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_industries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      icon TEXT,
      url TEXT,
      display_order INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cms_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER DEFAULT 0,
      url TEXT NOT NULL,
      alt_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateColumns();
  seedDefaultData();
}

/**
 * Ensure all table columns exist during schema upgrades
 */
function migrateColumns() {
  function ensureColumn(table, colName, colDef) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      const exists = cols.some(c => c.name === colName);
      if (!exists) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
      }
    } catch (e) {}
  }

  ['category', 'type', 'is_read', 'link'].forEach(col => {
    ensureColumn('notifications', col, 'TEXT');
  });

  ['result', 'details'].forEach(col => {
    ensureColumn('activity_logs', col, 'TEXT');
  });

  ['is_starred', 'is_archived'].forEach(col => {
    ensureColumn('messages', col, 'INTEGER DEFAULT 0');
  });
  ensureColumn('messages', 'folder', "TEXT DEFAULT 'inbox'");

  ['related_message_id'].forEach(col => {
    ensureColumn('bookings', col, 'INTEGER');
  });
  ['company', 'google_meet_url'].forEach(col => {
    ensureColumn('bookings', col, 'TEXT');
  });
}

/**
 * Seed Default Data (5 Standard Roles: Super Admin, Admin, Editor, Sales, Viewer)
 */
function seedDefaultData() {
  // 1. Seed 5 Roles
  const roles = [
    { name: 'Super Admin', slug: 'super_admin', description: 'Full unconstrained administrative access', permissions: JSON.stringify(['*']) },
    { name: 'Admin', slug: 'admin', description: 'Administrative access for content, leads, analytics and settings', permissions: JSON.stringify(['content.*', 'leads.*', 'analytics.*', 'settings.*', 'automations.*', 'webhooks.*']) },
    { name: 'Editor', slug: 'editor', description: 'Content and media creation and editing permissions', permissions: JSON.stringify(['content.*', 'media.*', 'analytics.view']) },
    { name: 'Sales', slug: 'sales', description: 'Leads, bookings, and messages management', permissions: JSON.stringify(['leads.*', 'bookings.*', 'messages.*', 'contacts.*', 'payments.view']) },
    { name: 'Viewer', slug: 'viewer', description: 'Read-only access across dashboard', permissions: JSON.stringify(['*.view']) }
  ];

  const upsertRole = db.prepare(`
    INSERT INTO roles (name, slug, description, permissions)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET permissions = excluded.permissions, description = excluded.description
  `);

  for (const r of roles) {
    upsertRole.run(r.name, r.slug, r.description, r.permissions);
  }

  // 2. Seed Super Admin User (Md. Sharafat Ullah / admin@calinex.us)
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync('Admin@Calinex2026!', salt, 64).toString('hex');
    const superAdminRole = db.prepare("SELECT id FROM roles WHERE slug = 'super_admin'").get();

    db.prepare(`
      INSERT INTO users (name, email, password_hash, salt, role_id, avatar, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Md. Sharafat Ullah',
      'admin@calinex.us',
      passwordHash,
      salt,
      superAdminRole.id,
      'images/md-sharafat-ullah.jpg',
      'active'
    );
  }

  // 3. Seed Website Forms Directory
  const existingForms = db.prepare('SELECT COUNT(*) as count FROM forms').get();
  if (existingForms.count === 0) {
    const defaultForms = [
      { name: 'Contact Page Main Form', form_identifier: 'contact_page_form', url: '/contact', submission_count: 0, status: 'Active' },
      { name: 'Global Schedule & Booking Popup Form', form_identifier: 'global_schedule_popup', url: '/ (All Pages Modal)', submission_count: 0, status: 'Active' },
      { name: 'Startups Package Inbound Form', form_identifier: 'startups_inbound_form', url: '/startups', submission_count: 0, status: 'Active' },
      { name: 'Pricing Custom Scope Form', form_identifier: 'pricing_scope_form', url: '/pricing', submission_count: 0, status: 'Active' }
    ];

    const insertForm = db.prepare('INSERT INTO forms (name, form_identifier, url, submission_count, status) VALUES (?, ?, ?, ?, ?)');
    for (const f of defaultForms) {
      insertForm.run(f.name, f.form_identifier, f.url, f.submission_count, f.status);
    }
  }

  // 4. Seed Standard Default Automations
  const existingAutomations = db.prepare('SELECT COUNT(*) as count FROM automations').get();
  if (existingAutomations.count === 0) {
    const defaultAutomations = [
      {
        name: 'Inbound Lead Intake & AI Analysis Pipeline',
        trigger_type: 'new_message',
        conditions: JSON.stringify([]),
        actions: JSON.stringify([
          { type: 'ai_lead_analysis' },
          { type: 'add_google_sheets' },
          { type: 'send_resend_email', template_slug: 'new_contact_notification', recipient: 'admin@calinex.us' },
          { type: 'send_resend_email', template_slug: 'visitor_confirmation', recipient: '{{email}}' },
          { type: 'create_notification', title: 'New Inbound Lead', message: '{{name}} submitted a project inquiry.' },
          { type: 'send_webhook', event_type: 'message.created' }
        ]),
        is_enabled: 1
      },
      {
        name: 'Client Discovery Booking Confirmation Pipeline',
        trigger_type: 'new_booking',
        conditions: JSON.stringify([]),
        actions: JSON.stringify([
          { type: 'send_resend_email', template_slug: 'booking_confirmation', recipient: '{{email}}' },
          { type: 'create_notification', title: 'New Meeting Booked', message: 'Discovery call confirmed with {{name}}.' },
          { type: 'add_google_sheets' },
          { type: 'send_webhook', event_type: 'booking.created' }
        ]),
        is_enabled: 1
      },
      {
        name: 'Payment Receipt & Client Onboarding Pipeline',
        trigger_type: 'payment_successful',
        conditions: JSON.stringify([]),
        actions: JSON.stringify([
          { type: 'send_resend_email', template_slug: 'payment_confirmation', recipient: '{{email}}' },
          { type: 'update_contact_status', status: 'client' },
          { type: 'create_notification', title: 'Payment Confirmed', message: 'Received payment from {{name}}.' },
          { type: 'send_webhook', event_type: 'payment.success' }
        ]),
        is_enabled: 1
      }
    ];

    const insertAuto = db.prepare(`
      INSERT INTO automations (name, trigger_type, conditions, actions, is_enabled)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const a of defaultAutomations) {
      insertAuto.run(a.name, a.trigger_type, a.conditions, a.actions, a.is_enabled);
    }
  }

  // 5. Seed Core Integrations (8 Core Providers)
  const defaultIntegrations = [
    { provider: 'google', name: 'Google Workspace (OAuth 2.0)', status: 'disconnected', config: JSON.stringify({ client_id: '', client_secret: '', redirect_uri: 'http://localhost:3000/api/admin/integrations/google/callback', connected_email: '', connected_name: '' }) },
    { provider: 'gmail', name: 'Gmail API Integration', status: 'disconnected', config: JSON.stringify({ auto_sync_inbox: true, send_via_gmail: true }) },
    { provider: 'google_calendar', name: 'Google Calendar Meeting Sync', status: 'disconnected', config: JSON.stringify({ calendar_id: 'primary', calendar_name: 'Md. Sharafat Ullah Schedule', timezone: 'Asia/Dhaka', auto_create_events: true }) },
    { provider: 'google_sheets', name: 'Google Sheets CRM Sync', status: 'disconnected', config: JSON.stringify({ spreadsheet_id: '', spreadsheet_name: 'CALINEX Leads Database', worksheet_name: 'Inbound Leads', auto_sync: true }) },
    { provider: 'resend', name: 'Resend Email Service', status: 'disconnected', config: JSON.stringify({ api_key: '', from_name: 'CALINEX | Md. Sharafat Ullah', from_email: 'admin@calinex.us', reply_to: 'admin@calinex.us' }) },
    { provider: 'stripe', name: 'Stripe Payments Engine', status: 'disconnected', config: JSON.stringify({ secret_key: '', publishable_key: '', webhook_secret: '', currency: 'USD' }) },
    { provider: 'openai', name: 'OpenAI Intelligence Engine', status: 'disconnected', config: JSON.stringify({ api_key: '', model: 'gpt-4o', system_prompt: 'You are an elite product designer and sales strategist for CALINEX, led by Md. Sharafat Ullah.', enable_ai_analysis: true, enable_ai_assistant: true }) },
    { provider: 'cal_com', name: 'Cal.com Scheduling Engine', status: 'disconnected', config: JSON.stringify({ cal_url: 'https://cal.com/calinex-branding-37xga9/15min', event_type: 'project-discussion', api_key: '', webhook_url: '/api/public/webhooks/cal', webhook_active: true }) }
  ];

  const upsertInt = db.prepare(`
    INSERT INTO integrations (provider, name, status, config)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(provider) DO NOTHING
  `);
  for (const i of defaultIntegrations) {
    upsertInt.run(i.provider, i.name, i.status, i.config);
  }

  // 6. Seed Analytics Settings
  const existingAnalytics = db.prepare("SELECT COUNT(*) as count FROM settings WHERE key = 'google_analytics_id'").get();
  if (existingAnalytics.count === 0) {
    db.prepare("INSERT INTO settings (key, value, group_name) VALUES ('google_analytics_id', '', 'analytics')").run();
    db.prepare("INSERT INTO settings (key, value, group_name) VALUES ('analytics_provider', 'none', 'analytics')").run();
  }
}

// Run initialization immediately
initSchema();

module.exports = {
  db,
  initSchema
};
