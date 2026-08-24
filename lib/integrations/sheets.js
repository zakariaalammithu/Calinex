function getDb() { return require('../db').db || require('./db').db; }
function getLogActivity() { try { return require('../auth').logActivity || require('./auth').logActivity; } catch(e) { return () => {}; } }

/**
 * Google Sheets Lead Sync Engine
 */

function getSheetsConfig() {
  const row = getDb().prepare("SELECT * FROM integrations WHERE provider = 'google_sheets'").get();
  if (!row) return { status: 'disconnected', config: {} };
  try {
    return {
      status: row.status,
      last_success_at: row.last_success_at,
      last_error_at: row.last_error_at,
      last_error_message: row.last_error_message,
      config: JSON.parse(row.config || '{}')
    };
  } catch (e) {
    return { status: 'disconnected', config: {} };
  }
}

/**
 * Sync Single Lead to Google Sheets
 */
async function syncLeadToSheets(messageId, leadData) {
  const { status, config } = getSheetsConfig();

  // If sync is disabled
  if (config.auto_sync === false) {
    getDb().prepare("UPDATE messages SET sheets_sync_status = 'none' WHERE id = ?").run(messageId);
    return { success: true, skipped: true };
  }

  const webhookUrl = config.webhook_url || config.endpoint_url || '';
  const spreadsheetId = config.spreadsheet_id || '';
  const worksheetName = config.worksheet_name || 'Inbound Leads';
  const fieldMapping = config.field_mapping || {
    'Lead Name': 'name',
    'Email': 'email',
    'Phone': 'phone',
    'Company': 'company',
    'Budget': 'budget',
    'Services': 'service',
    'Message': 'message',
    'Source': 'source',
    'Created Date': 'created_at'
  };

  // Build row object based on field mapping
  const rowData = {};
  for (const [colHeader, dataKey] of Object.entries(fieldMapping)) {
    rowData[colHeader] = leadData[dataKey] || '';
  }

  // If no external webhook or credentials configured, simulate local sync success
  if (!webhookUrl && !config.access_token) {
    console.log(`[SHEETS SYNC SIMULATED] Message #${messageId} synced to "${worksheetName}"`);
    getDb().prepare("UPDATE messages SET sheets_sync_status = 'synced' WHERE id = ?").run(messageId);
    getDb().prepare(`
      UPDATE integrations SET
        status = 'connected',
        last_success_at = CURRENT_TIMESTAMP,
        last_error_message = NULL
      WHERE provider = 'google_sheets'
    `).run();

    getLogActivity()(null, `Synced Lead #${messageId} to Google Sheets (Simulated)`, 'GoogleSheets', messageId.toString(), '127.0.0.1', 'SheetsSync');
    return { success: true, simulated: true };
  }

  // Dispatch HTTP request to Google Apps Script / Sheet Endpoint
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        worksheetName,
        row: rowData,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      getDb().prepare("UPDATE messages SET sheets_sync_status = 'synced' WHERE id = ?").run(messageId);
      getDb().prepare(`
        UPDATE integrations SET
          status = 'connected',
          last_success_at = CURRENT_TIMESTAMP,
          last_error_message = NULL
        WHERE provider = 'google_sheets'
      `).run();

      getLogActivity()(null, `Synced Lead #${messageId} to Google Sheets Live`, 'GoogleSheets', messageId.toString(), '127.0.0.1', 'SheetsSync');
      return { success: true };
    } else {
      throw new Error(`Sheets endpoint responded with status ${response.status}`);
    }
  } catch (err) {
    const errMsg = err.message || 'Failed to sync with Google Sheets';
    console.warn(`[SHEETS SYNC FAILED] Message #${messageId}:`, errMsg);

    // Keep database record completely safe and mark as pending for retry
    getDb().prepare("UPDATE messages SET sheets_sync_status = 'pending' WHERE id = ?").run(messageId);
    getDb().prepare(`
      UPDATE integrations SET
        status = 'error',
        last_error_at = CURRENT_TIMESTAMP,
        last_error_message = ?
      WHERE provider = 'google_sheets'
    `).run(errMsg);

    return { success: false, error: errMsg, pending: true };
  }
}

/**
 * Manual Sync of All Pending Leads
 */
async function manualSyncPendingLeads() {
  const pendingMessages = getDb().prepare("SELECT * FROM messages WHERE sheets_sync_status = 'pending' ORDER BY id ASC LIMIT 50").all();
  let synced = 0;
  let failed = 0;

  for (const msg of pendingMessages) {
    const res = await syncLeadToSheets(msg.id, msg);
    if (res.success) synced++;
    else failed++;
  }

  return { total: pendingMessages.length, synced, failed };
}

module.exports = {
  getSheetsConfig,
  syncLeadToSheets,
  manualSyncPendingLeads
};
