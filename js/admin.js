/**
 * CALINEX Admin Dashboard Controller
 */

// 1. Check Authentication Token
const token = localStorage.getItem('calinex_admin_token');
if (!token) {
  window.location.href = '/admin-login.html';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `admin-toast ${type} show`;
  setTimeout(() => {
    toast.className = 'admin-toast';
  }, 4000);
}

// 2. Global State
let allLeads = [];
let siteSettings = {};

// 3. Tab Switching
window.switchTab = function(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.admin-tab-content').forEach(c => {
    c.style.display = c.id === `tab-${tabName}` ? 'block' : 'none';
  });
};

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    switchTab(tabName);
  });
});

// 4. API Request Helper
async function apiFetch(endpoint, options = {}) {
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + token;
  if (!options.headers['Content-Type'] && options.body) {
    options.headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, options);
  if (res.status === 401) {
    localStorage.removeItem('calinex_admin_token');
    window.location.href = '/admin-login.html';
    return null;
  }
  return res.json();
}

// 5. Load Stats
async function loadStats() {
  const data = await apiFetch('/api/admin/stats');
  if (!data || !data.success) return;

  const { totalLeads, leadsToday, newLeads, apisConfigured, notificationEmail } = data.stats;
  document.getElementById('statTotalLeads').textContent = totalLeads;
  document.getElementById('statNewLeads').textContent = newLeads;
  document.getElementById('statTodayLeads').textContent = leadsToday;
  document.getElementById('statApis').textContent = `${apisConfigured} Active`;
  document.getElementById('leadsTabCount').textContent = totalLeads;

  const emailEl = document.getElementById('currentAdminEmail');
  if (emailEl) emailEl.textContent = notificationEmail;
}

// 6. Format Date
function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 7. Render Leads Table
function renderLeadsTable(leads) {
  const tbodyAll = document.getElementById('allLeadsTableBody');
  const tbodyRecent = document.getElementById('recentLeadsTableBody');

  if (tbodyRecent) {
    const recent = leads.slice(0, 5);
    if (recent.length === 0) {
      tbodyRecent.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--admin-text-muted); padding:24px;">No inquiries received yet. Submit a test from the website!</td></tr>`;
    } else {
      tbodyRecent.innerHTML = recent.map(lead => `
        <tr>
          <td>${formatDate(lead.createdAt)}</td>
          <td><strong>${escapeHtml(lead.name || 'Anonymous')}</strong></td>
          <td><a href="mailto:${escapeHtml(lead.email)}" style="color:#818cf8; text-decoration:none;">${escapeHtml(lead.email)}</a></td>
          <td><span style="color:#d4ff32; font-weight:700;">${escapeHtml(lead.budget)}</span></td>
          <td>${(lead.services || []).map(s => `<span class="admin-badge" style="margin-right:4px;">${escapeHtml(s)}</span>`).join('') || '-'}</td>
          <td><span class="status-badge ${getStatusClass(lead.status)}">${escapeHtml(lead.status)}</span></td>
          <td>
            <button class="admin-btn admin-btn-secondary" style="padding:4px 10px; font-size:12px;" onclick="viewLeadDetail('${lead.id}')">View</button>
          </td>
        </tr>
      `).join('');
    }
  }

  if (tbodyAll) {
    if (leads.length === 0) {
      tbodyAll.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--admin-text-muted); padding:32px;">No leads matching current filters.</td></tr>`;
    } else {
      tbodyAll.innerHTML = leads.map(lead => `
        <tr>
          <td>${formatDate(lead.createdAt)}</td>
          <td><strong>${escapeHtml(lead.name || 'Anonymous')}</strong></td>
          <td><a href="mailto:${escapeHtml(lead.email)}" style="color:#818cf8; text-decoration:none;">${escapeHtml(lead.email)}</a></td>
          <td><span style="color:#d4ff32; font-weight:700;">${escapeHtml(lead.budget)}</span></td>
          <td>${escapeHtml(lead.source)}</td>
          <td>${(lead.services || []).map(s => `<span class="admin-badge" style="margin-right:4px; font-size:11px;">${escapeHtml(s)}</span>`).join('') || '-'}</td>
          <td>
            <select class="form-select-admin" style="padding:4px 8px; font-size:12px; width:auto;" onchange="updateLeadStatus('${lead.id}', this.value)">
              <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
              <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
              <option value="In Progress" ${lead.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Closed" ${lead.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="admin-btn admin-btn-secondary" style="padding:4px 10px; font-size:12px;" onclick="viewLeadDetail('${lead.id}')">View</button>
              <button class="admin-btn admin-btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteLead('${lead.id}')">✕</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

function getStatusClass(status) {
  if (status === 'New') return 'new';
  if (status === 'Contacted') return 'contacted';
  if (status === 'In Progress') return 'in-progress';
  if (status === 'Closed') return 'closed';
  return 'new';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 8. Load Leads
async function loadLeads() {
  const data = await apiFetch('/api/admin/leads');
  if (!data || !data.success) return;
  allLeads = data.leads || [];
  applyFilters();
}

function applyFilters() {
  const searchInput = document.getElementById('leadsSearchInput');
  const statusFilter = document.getElementById('leadsStatusFilter');

  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const status = statusFilter ? statusFilter.value : '';

  let filtered = allLeads;
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }
  if (query) {
    filtered = filtered.filter(l =>
      (l.name && l.name.toLowerCase().includes(query)) ||
      (l.email && l.email.toLowerCase().includes(query)) ||
      (l.budget && l.budget.toLowerCase().includes(query)) ||
      (l.goals && l.goals.toLowerCase().includes(query)) ||
      (l.source && l.source.toLowerCase().includes(query))
    );
  }

  renderLeadsTable(filtered);
}

const searchInput = document.getElementById('leadsSearchInput');
if (searchInput) searchInput.addEventListener('input', applyFilters);

const statusFilter = document.getElementById('leadsStatusFilter');
if (statusFilter) statusFilter.addEventListener('change', applyFilters);

// 9. Update Lead Status
window.updateLeadStatus = async function(leadId, newStatus) {
  const res = await apiFetch(`/api/admin/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });
  if (res && res.success) {
    showToast(`Lead status updated to "${newStatus}"`);
    loadStats();
  }
};

// 10. Delete Lead
window.deleteLead = async function(leadId) {
  if (!confirm('Are you sure you want to delete this lead record?')) return;
  const res = await apiFetch(`/api/admin/leads/${leadId}`, {
    method: 'DELETE'
  });
  if (res && res.success) {
    showToast('Lead deleted successfully');
    loadLeads();
    loadStats();
  }
};

// 11. View Lead Detail Modal
window.viewLeadDetail = function(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;

  const content = document.getElementById('leadModalContent');
  content.innerHTML = `
    <div><strong>Client:</strong> ${escapeHtml(lead.name || 'Not provided')}</div>
    <div><strong>Email:</strong> <a href="mailto:${escapeHtml(lead.email)}" style="color:#818cf8;">${escapeHtml(lead.email)}</a></div>
    <div><strong>Budget:</strong> <span style="color:#d4ff32; font-weight:700;">${escapeHtml(lead.budget)}</span></div>
    <div><strong>Source:</strong> ${escapeHtml(lead.source)}</div>
    <div><strong>Services:</strong> ${(lead.services || []).map(s => `<span class="admin-badge" style="margin-right:4px;">${escapeHtml(s)}</span>`).join('') || 'None'}</div>
    <div><strong>Submitted Date:</strong> ${new Date(lead.createdAt).toLocaleString()}</div>
    <div><strong>Client IP:</strong> ${escapeHtml(lead.ip || 'Unknown')}</div>
    <div style="margin-top:10px;">
      <strong>Project Goals & Description:</strong>
      <div style="background:#09090c; padding:14px; border-radius:8px; margin-top:6px; line-height:1.6; border:1px solid #202028; white-space:pre-wrap;">${escapeHtml(lead.goals || 'No description provided.')}</div>
    </div>
  `;

  document.getElementById('leadDetailModal').classList.add('is-open');
};

const closeLeadModalBtn = document.getElementById('closeLeadModalBtn');
if (closeLeadModalBtn) {
  closeLeadModalBtn.addEventListener('click', () => {
    document.getElementById('leadDetailModal').classList.remove('is-open');
  });
}

// 12. Export CSV
const exportCsvBtn = document.getElementById('exportLeadsCsvBtn');
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', () => {
    if (!allLeads.length) {
      return showToast('No leads available to export.', 'error');
    }

    const headers = ['ID', 'Date', 'Name', 'Email', 'Budget', 'Source', 'Services', 'Status', 'Goals'];
    const rows = allLeads.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleString(),
      `"${(l.name || '').replace(/"/g, '""')}"`,
      l.email,
      `"${(l.budget || '').replace(/"/g, '""')}"`,
      `"${(l.source || '').replace(/"/g, '""')}"`,
      `"${(l.services || []).join(', ')}"`,
      l.status,
      `"${(l.goals || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `calinex_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leads exported to CSV');
  });
}

// 13. Load & Save Settings (API Keys)
async function loadSettings() {
  const data = await apiFetch('/api/admin/settings');
  if (!data || !data.success) return;
  siteSettings = data.settings || {};

  // Populate Resend form
  if (document.getElementById('resendApiKey')) document.getElementById('resendApiKey').value = siteSettings.resendApiKey || '';
  if (document.getElementById('resendFromEmail')) document.getElementById('resendFromEmail').value = siteSettings.resendFromEmail || '';
  if (document.getElementById('notificationEmail')) document.getElementById('notificationEmail').value = siteSettings.notificationEmail || 'admin@calinex.us';

  // Populate OpenAI form
  if (document.getElementById('openaiApiKey')) document.getElementById('openaiApiKey').value = siteSettings.openaiApiKey || '';
  if (document.getElementById('openaiModel')) document.getElementById('openaiModel').value = siteSettings.openaiModel || 'gpt-4o';

  // Populate Stripe form
  if (document.getElementById('stripePublishableKey')) document.getElementById('stripePublishableKey').value = siteSettings.stripePublishableKey || '';
  if (document.getElementById('stripeSecretKey')) document.getElementById('stripeSecretKey').value = siteSettings.stripeSecretKey || '';
  if (document.getElementById('stripeWebhookSecret')) document.getElementById('stripeWebhookSecret').value = siteSettings.stripeWebhookSecret || '';

  // Populate Site Integrations
  if (document.getElementById('googleAnalyticsId')) document.getElementById('googleAnalyticsId').value = siteSettings.googleAnalyticsId || '';
  if (document.getElementById('calcomLink')) document.getElementById('calcomLink').value = siteSettings.calcomLink || '';
  if (document.getElementById('whatsappNumber')) document.getElementById('whatsappNumber').value = siteSettings.whatsappNumber || '';
}

async function saveSettingsData(partialSettings, formName) {
  const res = await apiFetch('/api/admin/settings', {
    method: 'POST',
    body: JSON.stringify(partialSettings)
  });
  if (res && res.success) {
    showToast(`✓ ${formName} saved successfully`);
    loadStats();
  } else {
    showToast('Failed to save settings', 'error');
  }
}

// Resend Form
const resendForm = document.getElementById('resendSettingsForm');
if (resendForm) {
  resendForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsData({
      resendApiKey: document.getElementById('resendApiKey').value.trim(),
      resendFromEmail: document.getElementById('resendFromEmail').value.trim(),
      notificationEmail: document.getElementById('notificationEmail').value.trim()
    }, 'Resend Email API');
  });
}

// Test Email Button
const testEmailBtn = document.getElementById('testEmailBtn');
if (testEmailBtn) {
  testEmailBtn.addEventListener('click', async () => {
    testEmailBtn.disabled = true;
    testEmailBtn.textContent = 'Sending test...';
    try {
      const res = await apiFetch('/api/admin/test-email', { method: 'POST' });
      if (res && res.success) {
        showToast('✓ Test email dispatched to admin@calinex.us');
      } else {
        showToast('Test failed: ' + (res.error || 'Check API key'), 'error');
      }
    } catch (e) {
      showToast('Error sending test email', 'error');
    } finally {
      testEmailBtn.disabled = false;
      testEmailBtn.textContent = '🧪 Send Test Email';
    }
  });
}

// OpenAI Form
const openaiForm = document.getElementById('openaiSettingsForm');
if (openaiForm) {
  openaiForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsData({
      openaiApiKey: document.getElementById('openaiApiKey').value.trim(),
      openaiModel: document.getElementById('openaiModel').value
    }, 'OpenAI Config');
  });
}

// Stripe Form
const stripeForm = document.getElementById('stripeSettingsForm');
if (stripeForm) {
  stripeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsData({
      stripePublishableKey: document.getElementById('stripePublishableKey').value.trim(),
      stripeSecretKey: document.getElementById('stripeSecretKey').value.trim(),
      stripeWebhookSecret: document.getElementById('stripeWebhookSecret').value.trim()
    }, 'Stripe Payment API');
  });
}

// Site Integrations Form
const siteIntegrationsForm = document.getElementById('siteIntegrationsForm');
if (siteIntegrationsForm) {
  siteIntegrationsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsData({
      googleAnalyticsId: document.getElementById('googleAnalyticsId').value.trim(),
      calcomLink: document.getElementById('calcomLink').value.trim(),
      whatsappNumber: document.getElementById('whatsappNumber').value.trim()
    }, 'Site Integrations');
  });
}

// 14. 2FA Security Password Reset
const sendVerificationCodeBtn = document.getElementById('sendVerificationCodeBtn');
const verifyPasswordForm = document.getElementById('verifyPasswordForm');
const stepRequestCode = document.getElementById('stepRequestCode');

if (sendVerificationCodeBtn) {
  sendVerificationCodeBtn.addEventListener('click', async () => {
    sendVerificationCodeBtn.disabled = true;
    sendVerificationCodeBtn.textContent = 'Generating & Sending Code...';

    try {
      const res = await apiFetch('/api/admin/request-password-change-code', { method: 'POST' });
      if (res && res.success) {
        showToast('✓ 6-Digit security code sent to admin@calinex.us');
        stepRequestCode.style.display = 'none';
        verifyPasswordForm.style.display = 'block';
        if (res.previewCode) {
          document.getElementById('codeSentHint').innerHTML = `Security code sent to admin@calinex.us. (Preview code: <strong style="color:#d4ff32;">${res.previewCode}</strong>)`;
        }
      } else {
        showToast(res.message || 'Failed to send verification code', 'error');
        sendVerificationCodeBtn.disabled = false;
        sendVerificationCodeBtn.textContent = '📩 Send 6-Digit Code to admin@calinex.us';
      }
    } catch (e) {
      showToast('Error requesting code', 'error');
      sendVerificationCodeBtn.disabled = false;
      sendVerificationCodeBtn.textContent = '📩 Send 6-Digit Code to admin@calinex.us';
    }
  });
}

const cancelPasswordResetBtn = document.getElementById('cancelPasswordResetBtn');
if (cancelPasswordResetBtn) {
  cancelPasswordResetBtn.addEventListener('click', () => {
    verifyPasswordForm.reset();
    verifyPasswordForm.style.display = 'none';
    stepRequestCode.style.display = 'block';
    if (sendVerificationCodeBtn) {
      sendVerificationCodeBtn.disabled = false;
      sendVerificationCodeBtn.textContent = '📩 Send 6-Digit Code to admin@calinex.us';
    }
  });
}

if (verifyPasswordForm) {
  verifyPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('securityCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      return showToast('Passwords do not match.', 'error');
    }
    if (newPassword.length < 6) {
      return showToast('Password must be at least 6 characters.', 'error');
    }

    const submitBtn = document.getElementById('confirmPasswordChangeBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
      const res = await apiFetch('/api/admin/verify-and-change-password', {
        method: 'POST',
        body: JSON.stringify({ code, newPassword })
      });

      if (res && res.success) {
        showToast('✓ Password successfully updated! Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('calinex_admin_token');
          window.location.href = '/admin-login.html';
        }, 2000);
      } else {
        showToast(res.message || 'Invalid verification code', 'error');
      }
    } catch (err) {
      showToast('Connection error updating password', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  });
}

// Quick password button from navbar
const openPasswordModalBtn = document.getElementById('openPasswordModalBtn');
if (openPasswordModalBtn) {
  openPasswordModalBtn.addEventListener('click', () => {
    switchTab('security');
  });
}

// Logout
const logoutBtn = document.getElementById('adminLogoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('calinex_admin_token');
    window.location.href = '/admin-login.html';
  });
}

// Initial Load
loadStats();
loadLeads();
loadSettings();
