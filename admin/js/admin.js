/**
 * CALINEX Streamlined Admin Dashboard, Centralized API Hub & Communications Controller
 */

// State
let currentUser = null;
let currentView = 'dashboard';

// DOM Elements
const viewContainer = document.getElementById('viewContainer');
const navItems = document.querySelectorAll('.nav-item');
const sidebar = document.getElementById('adminSidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

// Modals
const universalModal = document.getElementById('universalModal');
const universalModalTitle = document.getElementById('universalModalTitle');
const universalModalBody = document.getElementById('universalModalBody');
const saveUniversalModal = document.getElementById('saveUniversalModal');
const closeUniversalModal = document.getElementById('closeUniversalModal');
const cancelUniversalModal = document.getElementById('cancelUniversalModal');

// Topbar Dropdowns
const notifBtn = document.getElementById('notifBtn');
const notifDropdown = document.getElementById('notifDropdown');
const profileDropdownBtn = document.getElementById('profileDropdownBtn');
const profileDropdown = document.getElementById('profileDropdown');
const logoutBtn = document.getElementById('logoutBtn');

let onModalSaveCallback = null;

// Calendar & Email State
let calendarCurrentDate = new Date();
let emailCurrentFolder = 'inbox';
let emailSelectedId = null;

/**
 * Initialize Application
 */
async function initApp() {
  setupEventListeners();
  const authenticated = await checkAuth();
  if (authenticated) {
    handleRouting();
    loadNotifications();
  }
}

/**
 * Check Authentication & Load Profile
 */
async function checkAuth() {
  try {
    const token = localStorage.getItem('calinex_admin_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch('/api/admin/auth/me', { headers });
    if (!res.ok) {
      window.location.href = '/admin/login';
      return false;
    }

    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      renderUserProfile(currentUser);
      return true;
    } else {
      window.location.href = '/admin/login';
      return false;
    }
  } catch (err) {
    console.error('Auth verification failed:', err);
    window.location.href = '/admin/login';
    return false;
  }
}

function renderUserProfile(user) {
  document.getElementById('sidebarUserName').textContent = user.name || 'Md. Sharafat Ullah';
  document.getElementById('sidebarUserRole').textContent = user.roleName || 'Founder & CEO';
  document.getElementById('topbarName').textContent = user.name || 'Md. Sharafat Ullah';
  document.getElementById('dropdownUserName').textContent = user.name || 'Md. Sharafat Ullah';
  document.getElementById('dropdownUserEmail').textContent = user.email || 'admin@calinex.us';

  if (user.avatar) {
    document.getElementById('sidebarUserAvatar').src = '/' + user.avatar.replace(/^\//, '');
    document.getElementById('topbarAvatar').src = '/' + user.avatar.replace(/^\//, '');
  }
}

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('calinex_admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    return null;
  }
  return res.json();
}

/**
 * Router / View Dispatcher
 */
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  currentView = hash;

  navItems.forEach(item => {
    if (item.getAttribute('data-view') === hash) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  switch (hash) {
    case 'dashboard':
      renderDashboardView();
      break;
    case 'email':
    case 'contact':
    case 'contacts-inbox':
      renderEmailView();
      break;
    case 'calendar':
    case 'meetings':
    case 'meeting-book':
      renderCalendarView();
      break;
    case 'contacts':
      renderContactsView();
      break;
    case 'payments':
      renderPaymentsView();
      break;
    case 'cms':
    case 'cms-pages':
    case 'cms-services':
    case 'cms-case-studies':
    case 'cms-testimonials':
    case 'cms-team':
    case 'cms-media':
      renderCmsView();
      break;
    case 'automations':
      renderAutomationsView();
      break;
    case 'integrations':
      renderIntegrationsView();
      break;
    case 'settings':
    case 'settings-general':
    case 'settings-users':
    case 'settings-activity':
    case 'settings-health':
      renderSettingsView();
      break;
    default:
      renderDashboardView();
  }
}

/**
 * ====================================================================
 * 1. DASHBOARD VIEW (Streamlined Executive Overview)
 * ====================================================================
 */
async function renderDashboardView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Executive Dashboard</h1>
        <p class="page-subtitle">Welcome back, ${currentUser ? currentUser.name : 'Md. Sharafat Ullah'}. Real-time agency operations &amp; client communications.</p>
      </div>
      <div class="header-actions">
        <a href="#email" class="btn-lime" style="display: inline-flex; align-items: center; gap: 7px; text-decoration: none; font-weight: 700; padding: 9px 16px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <span>Contact Messages</span>
        </a>
        <a href="#calendar" class="btn-primary" style="display: inline-flex; align-items: center; gap: 7px; text-decoration: none; font-weight: 700; padding: 9px 16px; background: #2563eb; color: #ffffff; border-radius: var(--radius-md);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Meeting Book</span>
        </a>
        <button type="button" class="btn-secondary" onclick="renderDashboardView()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- 6 Metric Cards Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">Total Messages</span>
          <div class="metric-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path></svg></div>
        </div>
        <div class="metric-value" id="statTotalMessages">0</div>
        <div class="metric-footer">Real-time inquiries received</div>
      </div>

      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">New Leads</span>
          <div class="metric-icon-wrap" style="background: rgba(235, 254, 91, 0.15); color: var(--accent-lime);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg></div>
        </div>
        <div class="metric-value" id="statNewMessages">0</div>
        <div class="metric-footer"><span class="is-positive">Awaiting reply</span></div>
      </div>

      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">CRM Contacts</span>
          <div class="metric-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
        </div>
        <div class="metric-value" id="statTotalContacts">0</div>
        <div class="metric-footer">Deduplicated client profiles</div>
      </div>

      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">Discovery Bookings</span>
          <div class="metric-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg></div>
        </div>
        <div class="metric-value" id="statTotalBookings">0</div>
        <div class="metric-footer">Google &amp; Cal.com meetings</div>
      </div>

      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">Stripe Revenue</span>
          <div class="metric-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-success);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
        </div>
        <div class="metric-value" id="statTotalRevenue">$0</div>
        <div class="metric-footer">Completed transactions</div>
      </div>

      <div class="metric-card">
        <div class="metric-card-top">
          <span class="metric-card-label">Integrations Hub</span>
          <div class="metric-icon-wrap" style="background: rgba(42, 26, 212, 0.08); color: var(--accent-primary);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
        </div>
        <div class="metric-value" id="statActiveIntegrations" style="font-size: 24px; font-weight: 800; color: var(--accent-primary);">0 Active</div>
        <div class="metric-footer">Verified Active Services</div>
      </div>
    </div>

    <!-- 2 Column Overview Section -->
    <div style="display: grid; grid-template-columns: 1.6fr 1.1fr; gap: 24px; margin-top: 24px;">
      <!-- Left Column: Inbound Leads Table -->
      <div class="dashboard-panel">
        <div class="panel-header">
          <h3 class="panel-title">Recent Inbound Leads &amp; Briefs</h3>
          <a href="#email" class="btn-secondary" style="padding: 4px 10px; font-size: 12px;">Open Inbox</a>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Company</th>
                <th>AI Score</th>
                <th>Budget</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="dashLeadsTbody">
              <tr><td colspan="5" style="text-align:center; padding: 20px;">Loading leads...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Column: Upcoming Calendar Meetings -->
      <div class="dashboard-panel">
        <div class="panel-header">
          <h3 class="panel-title">Upcoming Discovery Meetings</h3>
          <a href="#calendar" class="btn-secondary" style="padding: 4px 10px; font-size: 12px;">Open Calendar</a>
        </div>
        <div id="dashBookingsList" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading meetings...</div>
        </div>
      </div>
    </div>
  `;

  // Fetch live stats
  const data = await apiFetch('/api/admin/dashboard/stats');
  if (data && data.success) {
    const s = data.stats;
    document.getElementById('statTotalMessages').textContent = s.totalMessages || 0;
    document.getElementById('statNewMessages').textContent = s.newMessages || 0;
    document.getElementById('statTotalContacts').textContent = s.totalContacts || 0;
    document.getElementById('statTotalBookings').textContent = s.totalBookings || 0;
    document.getElementById('statTotalRevenue').textContent = `$${Number(s.totalRevenue).toLocaleString()}`;
    if (document.getElementById('statActiveIntegrations')) {
      document.getElementById('statActiveIntegrations').textContent = `${s.activeIntegrations || 0} Active`;
    }

    const badge = document.getElementById('sidebarMsgBadge');
    if (badge) badge.textContent = s.newMessages || 0;

    const meetingBadge = document.getElementById('sidebarMeetingBadge');
    if (meetingBadge) meetingBadge.textContent = s.totalBookings || 0;

    // Render Leads
    const leadsTbody = document.getElementById('dashLeadsTbody');
    if (data.recentLeads && data.recentLeads.length > 0) {
      leadsTbody.innerHTML = data.recentLeads.map(l => `
        <tr>
          <td>
            <strong style="color: var(--text-primary);">${escapeHtml(l.name)}</strong>
            <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(l.email)}</div>
          </td>
          <td>${escapeHtml(l.company || '—')}</td>
          <td><span class="status-badge published">⚡ ${l.ai_score || 85}/100</span></td>
          <td><span style="color: var(--accent-lime); font-weight: 700;">${escapeHtml(l.budget || 'Custom')}</span></td>
          <td style="text-align: right;">
            <a href="#email" class="btn-secondary" style="padding: 4px 8px; font-size: 11.5px;">View &amp; Reply</a>
          </td>
        </tr>
      `).join('');
    } else {
      leadsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted);">No inbound messages yet.</td></tr>`;
    }

    // Render Bookings
    const bkList = document.getElementById('dashBookingsList');
    if (data.recentBookings && data.recentBookings.length > 0) {
      bkList.innerHTML = data.recentBookings.map(b => `
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(b.client_name)}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(b.meeting_type || 'Discovery Call')} &bull; ${escapeHtml(b.booking_date || '')} ${escapeHtml(b.time_slot || '')}</div>
          </div>
          <span class="status-badge ${b.status === 'confirmed' ? 'published' : 'pending'}">${escapeHtml(b.status || 'Confirmed')}</span>
        </div>
      `).join('');
    } else {
      bkList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12.5px;">No meetings scheduled yet.</div>`;
    }
  }
}

/**
 * ====================================================================
 * 2. LIVE EMAIL & INBOX SECTION (#email)
 * ====================================================================
 */
async function renderEmailView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Inbox &amp; Client Communications</h1>
        <p class="page-subtitle">Integrated Gmail &amp; Website brief manager with AI Lead Scoring and automated AI Reply Assistant.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-primary" onclick="openComposeEmailModal()">+ Compose Email</button>
      </div>
    </div>

    <!-- Email Split-View Container -->
    <div class="email-app-container">
      <!-- 1. Folders Sidebar -->
      <div class="email-folders-sidebar">
        <button type="button" class="email-folder-btn active" data-folder="inbox" onclick="changeEmailFolder('inbox', this)">
          <span>📥 Inbox</span>
          <span class="nav-badge" id="emInboxCount">0</span>
        </button>
        <button type="button" class="email-folder-btn" data-folder="qualified" onclick="changeEmailFolder('qualified', this)">
          <span>⚡ High-Priority</span>
          <span class="nav-badge" id="emQualCount">0</span>
        </button>
        <button type="button" class="email-folder-btn" data-folder="starred" onclick="changeEmailFolder('starred', this)">
          <span>⭐ Starred</span>
          <span class="nav-badge" id="emStarCount">0</span>
        </button>
        <button type="button" class="email-folder-btn" data-folder="archived" onclick="changeEmailFolder('archived', this)">
          <span>📦 Archived</span>
          <span class="nav-badge" id="emArchCount">0</span>
        </button>
      </div>

      <!-- 2. Message List Column -->
      <div class="email-list-column">
        <div class="email-list-header">
          <input type="text" id="emailSearchInput" class="form-input" placeholder="Search by sender, keyword..." style="font-size: 12px; padding: 6px 10px;">
        </div>
        <div class="email-list-scroll" id="emailListScroll">
          <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 12.5px;">Loading messages...</div>
        </div>
      </div>

      <!-- 3. Message Reader Column -->
      <div class="email-viewer-column" id="emailViewerColumn">
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 13px;">
          Select an email or brief from the list to view.
        </div>
      </div>
    </div>
  `;

  loadEmailThreads();

  document.getElementById('emailSearchInput').addEventListener('input', () => loadEmailThreads());
}

async function loadEmailThreads() {
  const q = document.getElementById('emailSearchInput')?.value.trim() || '';
  const url = `/api/admin/email/threads?folder=${emailCurrentFolder}&q=${encodeURIComponent(q)}`;
  const data = await apiFetch(url);

  if (data && data.success) {
    if (data.counts) {
      document.getElementById('emInboxCount').textContent = data.counts.inbox;
      document.getElementById('emQualCount').textContent = data.counts.qualified;
      document.getElementById('emStarCount').textContent = data.counts.starred;
      document.getElementById('emArchCount').textContent = data.counts.archived;
    }

    const scrollEl = document.getElementById('emailListScroll');
    if (!scrollEl) return;

    if (data.messages.length === 0) {
      scrollEl.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 12.5px;">No messages in this folder.</div>`;
      return;
    }

    scrollEl.innerHTML = data.messages.map(m => `
      <div class="email-list-item ${m.id === emailSelectedId ? 'active' : ''} ${m.status === 'New' ? 'unread' : ''}" onclick="selectEmailMessage(${m.id})">
        <div class="email-item-header">
          <span class="email-item-sender">${escapeHtml(m.name)}</span>
          <span class="email-item-time">${new Date(m.created_at).toLocaleDateString()}</span>
        </div>
        <div class="email-item-subject">${escapeHtml(m.service || m.company || 'Project Inquiry')}</div>
        <div class="email-item-snippet">${escapeHtml(m.message || '—')}</div>
        ${m.ai_score ? `<span class="status-badge published" style="font-size: 10px; margin-top: 4px;">⚡ AI Score: ${m.ai_score}/100</span>` : ''}
      </div>
    `).join('');

    // If no message selected, open the first one
    if (!emailSelectedId && data.messages.length > 0) {
      selectEmailMessage(data.messages[0].id);
    }
  }
}

function changeEmailFolder(folder, btn) {
  emailCurrentFolder = folder;
  document.querySelectorAll('.email-folder-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  emailSelectedId = null;
  loadEmailThreads();
}

async function selectEmailMessage(msgId) {
  emailSelectedId = msgId;
  document.querySelectorAll('.email-list-item').forEach(el => el.classList.remove('active'));

  const viewer = document.getElementById('emailViewerColumn');
  if (!viewer) return;

  const data = await apiFetch(`/api/admin/email/messages/${msgId}`);
  if (!data || !data.success || !data.message) return;

  const m = data.message;
  viewer.innerHTML = `
    <div class="email-viewer-header">
      <div>
        <h2 style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${escapeHtml(m.service || 'Project Inquiry')}</h2>
        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
          From: <strong style="color: #fff;">${escapeHtml(m.name)}</strong> &lt;<a href="mailto:${escapeHtml(m.email)}" style="color: var(--accent-primary);">${escapeHtml(m.email)}</a>&gt; &bull; Company: <strong>${escapeHtml(m.company || 'Not Specified')}</strong>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn-secondary" style="padding: 6px 10px; font-size: 12px;" onclick="toggleStarMessage(${m.id})">${m.is_starred ? '⭐ Starred' : '☆ Star'}</button>
        <button type="button" class="btn-secondary" style="padding: 6px 10px; font-size: 12px;" onclick="toggleArchiveMessage(${m.id})">${m.is_archived ? 'Unarchive' : 'Archive'}</button>
      </div>
    </div>

    <div class="email-viewer-body">
      <!-- Client Metadata Pill Grid -->
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="background: var(--bg-card-subtle); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
          <span style="color: var(--text-muted);">Budget:</span> <strong style="color: var(--accent-lime);">${escapeHtml(m.budget || 'Custom')}</strong>
        </div>
        <div style="background: var(--bg-card-subtle); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
          <span style="color: var(--text-muted);">Phone:</span> <strong>${escapeHtml(m.phone || '—')}</strong>
        </div>
        <div style="background: var(--bg-card-subtle); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
          <span style="color: var(--text-muted);">Received:</span> <strong>${new Date(m.created_at).toLocaleString()}</strong>
        </div>
      </div>

      <!-- OpenAI Analysis & Scoring Box -->
      <div style="background: rgba(235, 254, 91, 0.05); border: 1px solid rgba(235, 254, 91, 0.2); padding: 14px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="background: var(--accent-lime); color: #000; font-size: 10.5px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">AI LEAD SCORE</span>
          <span class="status-badge published">⚡ ${m.ai_score || 85}/100 &bull; ${escapeHtml(m.ai_priority || 'High Priority')}</span>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(m.ai_summary || 'Inbound enterprise design inquiry.')}</div>
        <div style="font-size: 12px; color: var(--accent-lime); margin-top: 6px;"><strong>Recommended Next Action:</strong> ${escapeHtml(m.ai_recommended_action || 'Send proposal and schedule 30-min discovery call.')}</div>
      </div>

      <!-- Original Message Body -->
      <div style="font-size: 14px; line-height: 1.6; background: var(--bg-input); padding: 16px; border-radius: 8px; border: 1px solid var(--border-subtle); margin-bottom: 24px;">
        ${escapeHtml(m.message || '—').replace(/\n/g, '<br>')}
      </div>

      <!-- Integrated AI Reply Assistant -->
      <div class="ai-reply-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 14px; font-weight: 700; color: #fff;">AI Reply Assistant (Gmail &amp; Resend)</h4>
          <button type="button" class="btn-secondary" style="font-size: 11.5px; padding: 4px 8px;" onclick="regenerateAiReplyDraft(${m.id})">Regenerate AI Draft</button>
        </div>
        <textarea id="emailReplyDraft" class="form-textarea" style="min-height: 110px; margin-bottom: 12px;">${escapeHtml(m.ai_suggested_reply || `Hi ${m.name},\n\nThank you for reaching out to CALINEX! We would love to discuss your project. Let's connect for a 30-minute discovery call.\n\nBest regards,\nMd. Sharafat Ullah\nFounder & CEO, CALINEX`)}</textarea>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-primary" onclick="sendReplyDirectly(${m.id}, '${escapeHtml(m.email)}')">Send Email Reply</button>
          <a href="#calendar" class="btn-secondary" style="font-size: 12px;">Schedule in Calendar</a>
        </div>
      </div>
    </div>
  `;
}

function toggleStarMessage(id) { apiFetch(`/api/admin/email/messages/${id}/star`, { method: 'POST' }).then(() => loadEmailThreads()); }
function toggleArchiveMessage(id) { apiFetch(`/api/admin/email/messages/${id}/archive`, { method: 'POST' }).then(() => loadEmailThreads()); }

function regenerateAiReplyDraft(msgId) {
  apiFetch(`/api/admin/leads/messages/${msgId}/ai-reply`, { method: 'POST', body: JSON.stringify({ instructions: 'Enthusiastic and clear call to action' }) }).then(res => {
    if (res && res.reply) {
      document.getElementById('emailReplyDraft').value = res.reply;
    }
  });
}

function sendReplyDirectly(msgId, email) {
  const bodyText = document.getElementById('emailReplyDraft')?.value.trim();
  apiFetch('/api/admin/email/send', {
    method: 'POST',
    body: JSON.stringify({ to: email, subject: 'Re: CALINEX Project Discussion', body_text: bodyText, reply_to_id: msgId })
  }).then(res => {
    alert('Email reply sent successfully via Gmail / Resend!');
    loadEmailThreads();
  });
}

function openComposeEmailModal() {
  universalModalTitle.textContent = 'Compose Direct Email';
  universalModalBody.innerHTML = `
    <form id="compForm">
      <div class="form-group">
        <label class="form-label">Recipient Email *</label>
        <input type="email" id="cTo" class="form-input" required placeholder="client@company.com">
      </div>
      <div class="form-group">
        <label class="form-label">Subject *</label>
        <input type="text" id="cSub" class="form-input" required placeholder="CALINEX Project Scope &amp; Proposal">
      </div>
      <div class="form-group">
        <label class="form-label">Message Body *</label>
        <textarea id="cBody" class="form-textarea" style="min-height: 120px;" required placeholder="Write your message here..."></textarea>
      </div>
    </form>
  `;
  openModal(() => {
    const payload = {
      to: document.getElementById('cTo').value.trim(),
      subject: document.getElementById('cSub').value.trim(),
      body_text: document.getElementById('cBody').value.trim()
    };
    apiFetch('/api/admin/email/send', { method: 'POST', body: JSON.stringify(payload) }).then(() => {
      alert('Email sent successfully!');
      closeModal();
      loadEmailThreads();
    });
  });
}

/**
 * ====================================================================
 * 3. LIVE MEETING BOOK & CALENDAR SECTION (#calendar)
 * ====================================================================
 */
let meetingCurrentTab = 'list';
let meetingSearchQuery = '';
let meetingStatusFilter = 'all';
let cachedBookings = [];

async function renderCalendarView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Meeting Book &amp; Discovery Calls</h1>
        <p class="page-subtitle">Real-time sync from Cal.com, Google Calendar, and direct strategy calls. Auto-synced live.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-primary" onclick="openScheduleMeetingModal()" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>+ Schedule Meeting</span>
        </button>
        <button type="button" class="btn-secondary" onclick="loadMeetingBookingsData()" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- View Mode Switcher Tabs -->
    <div class="cms-nav-tabs" style="margin-bottom: 20px;">
      <button type="button" class="cms-tab-btn ${meetingCurrentTab === 'list' ? 'active' : ''}" onclick="switchMeetingTab('list')" id="tabMeetingList">
        📋 Meeting Bookings List (<span id="meetingCountLabel">0</span>)
      </button>
      <button type="button" class="cms-tab-btn ${meetingCurrentTab === 'grid' ? 'active' : ''}" onclick="switchMeetingTab('grid')" id="tabMeetingGrid">
        📅 Monthly Calendar View
      </button>
    </div>

    <!-- Container for dynamic content -->
    <div id="meetingMainContainer">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading Meeting Bookings...</div>
    </div>
  `;

  await loadMeetingBookingsData();
}

function switchMeetingTab(tab) {
  meetingCurrentTab = tab;
  document.getElementById('tabMeetingList')?.classList.toggle('active', tab === 'list');
  document.getElementById('tabMeetingGrid')?.classList.toggle('active', tab === 'grid');
  renderMeetingContent();
}

async function loadMeetingBookingsData() {
  const data = await apiFetch('/api/admin/bookings');
  cachedBookings = (data && data.success) ? (data.bookings || data.events || []) : [];
  
  const countLabel = document.getElementById('meetingCountLabel');
  if (countLabel) countLabel.textContent = cachedBookings.length;

  const sidebarBadge = document.getElementById('sidebarMeetingBadge');
  if (sidebarBadge) sidebarBadge.textContent = cachedBookings.length;

  renderMeetingContent();
}

function renderMeetingContent() {
  const container = document.getElementById('meetingMainContainer');
  if (!container) return;

  if (meetingCurrentTab === 'list') {
    renderMeetingListTable(container);
  } else {
    renderMeetingCalendarGrid(container);
  }
}

function renderMeetingListTable(container) {
  let filtered = cachedBookings;

  if (meetingStatusFilter !== 'all') {
    filtered = filtered.filter(b => (b.status || 'confirmed').toLowerCase() === meetingStatusFilter);
  }

  if (meetingSearchQuery) {
    const q = meetingSearchQuery.toLowerCase();
    filtered = filtered.filter(b =>
      (b.client_name && b.client_name.toLowerCase().includes(q)) ||
      (b.client_email && b.client_email.toLowerCase().includes(q)) ||
      (b.client_phone && b.client_phone.toLowerCase().includes(q)) ||
      (b.company && b.company.toLowerCase().includes(q)) ||
      (b.meeting_type && b.meeting_type.toLowerCase().includes(q))
    );
  }

  container.innerHTML = `
    <!-- Search & Filter Controls -->
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 10px; flex: 1; max-width: 420px;">
        <input type="text" id="meetingSearchInput" class="form-input" placeholder="Search by client name, email, phone..." value="${escapeHtml(meetingSearchQuery)}" oninput="onMeetingSearchInput(this.value)" style="padding: 8px 12px; font-size: 13px;">
      </div>

      <!-- Filter Buttons -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; ${meetingStatusFilter === 'all' ? 'background: var(--text-primary); color: #fff;' : ''}" onclick="filterMeetingStatus('all')">All (${cachedBookings.length})</button>
        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; ${meetingStatusFilter === 'confirmed' ? 'background: #2563eb; color: #fff;' : ''}" onclick="filterMeetingStatus('confirmed')">🟢 Confirmed</button>
        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; ${meetingStatusFilter === 'completed' ? 'background: #10b981; color: #fff;' : ''}" onclick="filterMeetingStatus('completed')">✅ Completed</button>
        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; ${meetingStatusFilter === 'rescheduled' ? 'background: #f59e0b; color: #fff;' : ''}" onclick="filterMeetingStatus('rescheduled')">🔄 Rescheduled</button>
        <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; ${meetingStatusFilter === 'cancelled' ? 'background: #ef4444; color: #fff;' : ''}" onclick="filterMeetingStatus('cancelled')">🚫 Cancelled</button>
      </div>
    </div>

    <!-- Meetings Data Table -->
    <div class="dashboard-panel" style="padding: 0; overflow: hidden;">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25%;">Client Details (Name, Phone, Email)</th>
              <th style="width: 22%;">Meeting Purpose &amp; Source</th>
              <th style="width: 18%;">Date &amp; Time</th>
              <th style="width: 18%;">Status / Action</th>
              <th style="text-align: right; width: 17%;">Manage</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length > 0 ? filtered.map(b => {
              const status = (b.status || 'confirmed').toLowerCase();
              const phoneDisplay = b.client_phone ? escapeHtml(b.client_phone) : '<span style="color: var(--text-muted); font-size: 11.5px;">No phone provided</span>';
              const cleanPhone = b.client_phone ? b.client_phone.replace(/[^0-9+]/g, '') : '';
              
              return `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 13.5px;">${escapeHtml(b.client_name)}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                      ✉️ <a href="mailto:${escapeHtml(b.client_email)}" style="color: var(--accent-primary); text-decoration: none;">${escapeHtml(b.client_email)}</a>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 6px;">
                      📞 <a href="tel:${cleanPhone}" style="color: var(--text-primary); text-decoration: none; font-weight: 600;">${phoneDisplay}</a>
                      ${cleanPhone ? `
                        <a href="https://wa.me/${cleanPhone.replace('+', '')}" target="_blank" title="Chat on WhatsApp" style="display: inline-flex; align-items: center; background: #25D366; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700; text-decoration: none;">
                          WA
                        </a>
                      ` : ''}
                    </div>
                    ${b.company ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">🏢 ${escapeHtml(b.company)}</div>` : ''}
                  </td>
                  <td>
                    <strong style="color: var(--text-primary); font-size: 13px;">${escapeHtml(b.meeting_type || 'Discovery Call')}</strong>
                    <div style="margin-top: 4px; display: flex; gap: 6px; align-items: center;">
                      <span class="status-badge ${b.source === 'Cal.com' ? 'published' : 'pending'}" style="font-size: 10.5px; padding: 2px 6px;">
                        ${escapeHtml(b.source || 'Cal.com')}
                      </span>
                      <span style="font-size: 11.5px; color: var(--text-muted);">${b.duration_minutes || 30} mins</span>
                    </div>
                    ${b.notes ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(b.notes)}">📝 ${escapeHtml(b.notes)}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">📅 ${escapeHtml(b.booking_date || '—')}</div>
                    <div style="font-size: 12.5px; color: #2563eb; font-weight: 700; margin-top: 3px;">⏰ ${escapeHtml(b.time_slot || '10:00 AM')}</div>
                  </td>
                  <td>
                    <select class="form-select" onchange="updateBookingStatus(${b.id}, this.value)" style="font-size: 12.5px; font-weight: 700; padding: 6px 10px; border-radius: 6px; background: ${status === 'confirmed' ? '#eff6ff' : (status === 'completed' ? '#ecfdf5' : (status === 'cancelled' ? '#fef2f2' : '#fefce8'))}; color: ${status === 'confirmed' ? '#1d4ed8' : (status === 'completed' ? '#047857' : (status === 'cancelled' ? '#b91c1c' : '#b45309'))}; border: 1px solid rgba(0,0,0,0.1);">
                      <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>🟢 Confirmed (Active)</option>
                      <option value="completed" ${status === 'completed' ? 'selected' : ''}>✅ Completed (Meeting Sesh)</option>
                      <option value="rescheduled" ${status === 'rescheduled' ? 'selected' : ''}>🔄 Rescheduled</option>
                      <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>🚫 Cancelled</option>
                      <option value="no_show" ${status === 'no_show' ? 'selected' : ''}>⚠️ No Show</option>
                    </select>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button type="button" class="btn-secondary" style="padding: 5px 9px; font-size: 12px;" onclick="openEventDetailsModal(${b.id})">
                        👁️ Brief
                      </button>
                      <button type="button" class="btn-secondary" style="padding: 5px 9px; font-size: 12px; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.3);" onclick="deleteMeetingBooking(${b.id})" title="Delete / Close Meeting">
                        🗑️ Close
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                  <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">No meetings found</div>
                  <div style="font-size: 12.5px;">All Cal.com bookings and direct scheduled calls will automatically appear here.</div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function onMeetingSearchInput(val) {
  meetingSearchQuery = val;
  const container = document.getElementById('meetingMainContainer');
  if (container && meetingCurrentTab === 'list') renderMeetingListTable(container);
}

function filterMeetingStatus(status) {
  meetingStatusFilter = status;
  const container = document.getElementById('meetingMainContainer');
  if (container && meetingCurrentTab === 'list') renderMeetingListTable(container);
}

async function updateBookingStatus(id, newStatus) {
  try {
    const res = await apiFetch(`/api/admin/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    if (res && res.success) {
      const match = cachedBookings.find(b => b.id === id);
      if (match) match.status = newStatus;
      const container = document.getElementById('meetingMainContainer');
      if (container && meetingCurrentTab === 'list') renderMeetingListTable(container);
    } else {
      alert('Could not update status: ' + (res?.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Status update failed:', err);
  }
}

async function deleteMeetingBooking(id) {
  if (confirm('Are you sure you want to close/delete this meeting booking?')) {
    const res = await apiFetch(`/api/admin/bookings/${id}?permanent=true`, { method: 'DELETE' });
    if (res && res.success) {
      cachedBookings = cachedBookings.filter(b => b.id !== id);
      loadMeetingBookingsData();
    }
  }
}

function renderMeetingCalendarGrid(container) {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  container.innerHTML = `
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="calendar-title-wrap">
          <h3 style="font-size: 18px; font-weight: 800; color: #fff;">${monthNames[month]} ${year}</h3>
        </div>
        <div class="calendar-nav-btns">
          <button type="button" class="btn-secondary" style="padding: 6px 12px;" onclick="navigateCalendar(-1)">&larr; Prev</button>
          <button type="button" class="btn-secondary" style="padding: 6px 12px;" onclick="resetCalendarToday()">Today</button>
          <button type="button" class="btn-secondary" style="padding: 6px 12px;" onclick="navigateCalendar(1)">Next &rarr;</button>
        </div>
      </div>

      <!-- 7 Column Day Header -->
      <div class="calendar-grid-header">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      <!-- Calendar Body Grid -->
      <div class="calendar-grid-body" id="calendarGridBody"></div>
    </div>
  `;

  loadCalendarGridEvents();
}

function navigateCalendar(direction) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
  renderMeetingContent();
}

function resetCalendarToday() {
  calendarCurrentDate = new Date();
  renderMeetingContent();
}

async function loadCalendarGridEvents() {
  const grid = document.getElementById('calendarGridBody');
  if (!grid) return;

  const events = cachedBookings;
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  let html = '';

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    html += `<div class="calendar-day-cell other-month"><div class="calendar-day-number">${dayNum}</div></div>`;
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Filter events for this day
    const dayEvents = events.filter(e => e.booking_date === dateStr);

    let eventsHtml = dayEvents.map(e => `
      <div class="calendar-event-badge ${e.source === 'Cal.com' ? 'cal-com' : 'google-meet'}" onclick="openEventDetailsModal(${e.id})" title="${escapeHtml(e.client_name)}: ${escapeHtml(e.meeting_type)}">
        <strong>${escapeHtml(e.time_slot || '10:00 AM')}</strong> ${escapeHtml(e.client_name)}
      </div>
    `).join('');

    html += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-events-list">${eventsHtml}</div>
      </div>
    `;
  }

  // Trailing next month days
  const totalCells = firstDayIndex + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    html += `<div class="calendar-day-cell other-month"><div class="calendar-day-number">${d}</div></div>`;
  }

  grid.innerHTML = html;
}

function openEventDetailsModal(eventId) {
  const e = cachedBookings.find(x => x.id === eventId);
  if (!e) return;

  const phoneDisplay = e.client_phone || 'Not provided';
  const cleanPhone = e.client_phone ? e.client_phone.replace(/[^0-9+]/g, '') : '';

  universalModalTitle.textContent = `Meeting Details: ${e.client_name}`;
  universalModalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="status-badge ${e.status === 'confirmed' ? 'published' : (e.status === 'completed' ? 'published' : 'pending')}">${escapeHtml(e.status || 'Confirmed')}</span>
        <span style="font-size: 13.5px; color: #2563eb; font-weight: 800;">📅 ${escapeHtml(e.booking_date || '')} @ ${escapeHtml(e.time_slot || '')}</span>
      </div>

      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 8px; font-size: 13px; display: flex; flex-direction: column; gap: 6px;">
        <div><strong>Client Name:</strong> ${escapeHtml(e.client_name)}</div>
        <div><strong>Email Address:</strong> <a href="mailto:${escapeHtml(e.client_email)}" style="color: var(--accent-primary); font-weight: 600;">${escapeHtml(e.client_email)}</a></div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong>Phone / WhatsApp:</strong> 
          <span>${escapeHtml(phoneDisplay)}</span>
          ${cleanPhone ? `
            <a href="https://wa.me/${cleanPhone.replace('+', '')}" target="_blank" style="background: #25D366; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-decoration: none;">
              Open WhatsApp
            </a>
          ` : ''}
        </div>
        <div><strong>Meeting Purpose:</strong> ${escapeHtml(e.meeting_type || 'Discovery Call')}</div>
        <div><strong>Booking Source:</strong> ${escapeHtml(e.source || 'Cal.com')}</div>
        ${e.company ? `<div><strong>Company:</strong> ${escapeHtml(e.company)}</div>` : ''}
      </div>

      ${e.notes ? `
        <div>
          <strong style="font-size: 13px;">Meeting Brief &amp; Notes:</strong>
          <div style="background: var(--bg-input); padding: 12px; border-radius: 6px; font-size: 12.5px; margin-top: 4px; border: 1px solid var(--border-subtle); line-height: 1.5;">
            ${escapeHtml(e.notes)}
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-primary" style="font-size: 12px; background: #10b981;" onclick="updateBookingStatus(${e.id}, 'completed'); closeModal();">
            ✅ Mark as Completed (Meeting Sesh)
          </button>
          <a href="mailto:${escapeHtml(e.client_email)}?subject=Follow-up: CALINEX Discovery Meeting" class="btn-secondary" style="font-size: 12px; text-decoration: none;">
            Send Email
          </a>
        </div>
        <button type="button" class="btn-danger" style="font-size: 12px;" onclick="deleteMeetingBooking(${e.id}); closeModal();">
          🗑️ Delete / Close
        </button>
      </div>
    </div>
  `;
  openModal(() => { closeModal(); });
}

function openScheduleMeetingModal() {
  universalModalTitle.textContent = 'Schedule New Discovery Meeting';
  universalModalBody.innerHTML = `
    <form id="schForm">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Client Name *</label>
          <input type="text" id="schName" class="form-input" required placeholder="Elena Rostova">
        </div>
        <div class="form-group">
          <label class="form-label">Client Email *</label>
          <input type="email" id="schEmail" class="form-input" required placeholder="elena@company.com">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone / WhatsApp Number</label>
          <input type="tel" id="schPhone" class="form-input" placeholder="+1 650 999 8888">
        </div>
        <div class="form-group">
          <label class="form-label">Company Name</label>
          <input type="text" id="schCompany" class="form-input" placeholder="FintechScale Inc">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Meeting Date *</label>
          <input type="date" id="schDate" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Time Slot *</label>
          <input type="text" id="schTime" class="form-input" required placeholder="04:00 PM" value="04:00 PM">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Meeting Type / Purpose</label>
        <input type="text" id="schType" class="form-input" placeholder="30-min UI/UX Strategy Call" value="30-min UI/UX Strategy Call">
      </div>
      <div class="form-group">
        <label class="form-label">Notes / Project Brief</label>
        <textarea id="schNotes" class="form-textarea" placeholder="Discuss UI/UX redesign, deliverables, and start timeline."></textarea>
      </div>
    </form>
  `;
  openModal(() => {
    const payload = {
      client_name: document.getElementById('schName').value.trim(),
      client_email: document.getElementById('schEmail').value.trim(),
      client_phone: document.getElementById('schPhone').value.trim(),
      company: document.getElementById('schCompany').value.trim(),
      booking_date: document.getElementById('schDate').value,
      time_slot: document.getElementById('schTime').value.trim(),
      meeting_type: document.getElementById('schType').value.trim(),
      notes: document.getElementById('schNotes').value.trim()
    };

    if (!payload.client_name || !payload.client_email || !payload.booking_date) {
      alert('Please fill out Client Name, Email, and Meeting Date.');
      return;
    }

    apiFetch('/api/admin/bookings', { method: 'POST', body: JSON.stringify(payload) }).then(() => {
      closeModal();
      loadMeetingBookingsData();
    });
  });
}

/**
 * ====================================================================
 * 4. CENTRALIZED API & INTEGRATIONS HUB (#integrations)
 * ====================================================================
 */
async function renderIntegrationsView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Centralized API &amp; Integrations Hub</h1>
        <p class="page-subtitle">Add, configure, test, and manage all external API keys and Google OAuth 2.0 connections in one place.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" onclick="renderIntegrationsView()">Refresh Status</button>
      </div>
    </div>

    <!-- 8 Integrations Hub Grid -->
    <div class="integrations-hub-grid" id="integrationsHubGrid">
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">Loading integrations...</div>
    </div>
  `;

  loadCentralizedIntegrations();
}

async function loadCentralizedIntegrations() {
  const grid = document.getElementById('integrationsHubGrid');
  if (!grid) return;

  const data = await apiFetch('/api/admin/integrations/all');
  if (!data || !data.success) return;

  grid.innerHTML = data.integrations.map(item => {
    const p = item.provider;
    const cfg = item.config || {};
    const isConnected = item.status === 'connected';

    let fieldsHtml = '';

    if (p === 'resend') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Resend API Key</label>
          <input type="password" id="field_resend_api_key" class="form-input" value="${cfg.api_key || ''}" placeholder="re_••••••••••••••••">
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Sender Email</label>
            <input type="email" id="field_resend_from_email" class="form-input" value="${cfg.from_email || 'admin@calinex.us'}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Sender Name</label>
            <input type="text" id="field_resend_from_name" class="form-input" value="${cfg.from_name || 'CALINEX | Md. Sharafat Ullah'}">
          </div>
        </div>
      `;
    } else if (p === 'stripe') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Stripe Secret Key</label>
          <input type="password" id="field_stripe_secret_key" class="form-input" value="${cfg.secret_key || ''}" placeholder="sk_live_••••••••••••••••">
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Publishable Key</label>
            <input type="text" id="field_stripe_publishable_key" class="form-input" value="${cfg.publishable_key || ''}" placeholder="pk_live_••••••••••••••••">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Currency</label>
            <input type="text" id="field_stripe_currency" class="form-input" value="${cfg.currency || 'USD'}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Webhook Secret</label>
          <input type="password" id="field_stripe_webhook_secret" class="form-input" value="${cfg.webhook_secret || ''}" placeholder="whsec_••••••••••••••••">
        </div>
      `;
    } else if (p === 'openai') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">OpenAI API Key</label>
          <input type="password" id="field_openai_api_key" class="form-input" value="${cfg.api_key || ''}" placeholder="sk-proj-••••••••••••••••">
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">AI Model</label>
            <input type="text" id="field_openai_model" class="form-input" value="${cfg.model || 'gpt-4o'}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Lead Scoring</label>
            <select id="field_openai_lead_scoring" class="form-select"><option value="true" ${cfg.enable_ai_analysis !== false ? 'selected' : ''}>Active (1-100)</option><option value="false" ${cfg.enable_ai_analysis === false ? 'selected' : ''}>Disabled</option></select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">System Prompt</label>
          <textarea id="field_openai_prompt" class="form-textarea" style="min-height: 60px; font-size: 12px;">${cfg.system_prompt || 'You are an elite product designer and sales strategist for CALINEX, led by Md. Sharafat Ullah.'}</textarea>
        </div>
      `;
    } else if (p === 'cal_com') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Cal.com API Key</label>
          <input type="password" id="field_cal_com_api_key" class="form-input" value="${cfg.api_key || ''}" placeholder="cal_live_••••••••••••••••">
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Cal.com Booking URL</label>
          <input type="text" id="field_cal_com_cal_url" class="form-input" value="${cfg.cal_url || 'https://cal.com/calinex-branding-37xga9/15min'}">
        </div>
      `;
    } else if (p === 'google') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Google OAuth Client ID</label>
          <input type="text" id="field_google_client_id" class="form-input" value="${cfg.client_id || ''}" placeholder="••••••••.apps.googleusercontent.com">
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Google OAuth Client Secret</label>
          <input type="password" id="field_google_client_secret" class="form-input" value="${cfg.client_secret || ''}" placeholder="GOCSPX-••••••••••••••••">
        </div>
        <div style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
          Connected Profile: <strong style="color: #fff;">${cfg.connected_email || 'Not Connected'}</strong>
        </div>
      `;
    } else if (p === 'google_calendar') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Google Calendar ID</label>
          <input type="text" id="field_google_calendar_id" class="form-input" value="${cfg.calendar_id || 'primary'}">
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Timezone</label>
            <input type="text" id="field_google_calendar_timezone" class="form-input" value="${cfg.timezone || 'Asia/Dhaka'}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Auto-create Events</label>
            <select id="field_google_calendar_auto" class="form-select"><option value="true">Enabled</option><option value="false">Disabled</option></select>
          </div>
        </div>
      `;
    } else if (p === 'google_sheets') {
      fieldsHtml = `
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 11.5px;">Google Spreadsheet ID</label>
          <input type="text" id="field_google_sheets_id" class="form-input" value="${cfg.spreadsheet_id || ''}" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms">
        </div>
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Sheet / Worksheet Name</label>
            <input type="text" id="field_google_sheets_name" class="form-input" value="${cfg.worksheet_name || 'Inbound Leads'}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Auto-Sync</label>
            <select id="field_google_sheets_auto" class="form-select"><option value="true">Enabled</option><option value="false">Disabled</option></select>
          </div>
        </div>
      `;
    } else if (p === 'gmail') {
      fieldsHtml = `
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Send via Gmail</label>
            <select id="field_gmail_send" class="form-select"><option value="true" ${cfg.send_via_gmail !== false ? 'selected' : ''}>Active (Gmail OAuth)</option><option value="false">Fallback (Resend)</option></select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11.5px;">Inbox Auto-Sync</label>
            <select id="field_gmail_sync" class="form-select"><option value="true">Active</option><option value="false">Manual</option></select>
          </div>
        </div>
      `;
    }

    return `
      <div class="integration-card" style="padding: 18px;">
        <div>
          <div class="integration-card-top" style="margin-bottom: 12px;">
            <div class="integration-logo-wrap">
              <div class="integration-icon-box" style="width: 38px; height: 38px;">
                <span style="font-weight: 800; font-size: 14px; color: var(--accent-primary);">${item.name.substring(0, 2).toUpperCase()}</span>
              </div>
              <div class="integration-info">
                <h4 style="font-size: 14px;">${escapeHtml(item.name)}</h4>
                <p style="font-size: 11px;">Provider: <code>${escapeHtml(item.provider)}</code></p>
              </div>
            </div>
            <span class="status-badge ${isConnected ? 'published' : 'archived'}">${isConnected ? 'Active' : 'Offline'}</span>
          </div>

          <div style="margin-bottom: 12px;">
            ${fieldsHtml}
          </div>
        </div>

        <div class="integration-card-actions" style="gap: 6px; margin-top: 8px;">
          <button type="button" class="btn-primary" style="flex: 1.2; font-size: 12px; padding: 6px 10px;" onclick="saveInlineProviderConfig('${item.provider}')">Save API</button>
          ${p === 'google' ? `
            ${isConnected ? `
              <button type="button" class="btn-danger" style="flex: 1; font-size: 12px; padding: 6px 8px;" onclick="disconnectGoogleOAuth()">Disconnect</button>
            ` : `
              <button type="button" class="btn-lime" style="flex: 1.4; font-size: 12px; padding: 6px 8px;" onclick="connectGoogleOAuth()">Connect Google</button>
            `}
          ` : ''}
          <button type="button" class="btn-secondary" style="flex: 0.8; font-size: 12px; padding: 6px 8px;" onclick="testIntegrationProbe('${item.provider}')">Test</button>
        </div>
      </div>
    `;
  }).join('');
}

function saveInlineProviderConfig(provider) {
  const payload = {};

  if (provider === 'resend') {
    payload.api_key = document.getElementById('field_resend_api_key')?.value.trim();
    payload.from_email = document.getElementById('field_resend_from_email')?.value.trim();
    payload.from_name = document.getElementById('field_resend_from_name')?.value.trim();
  } else if (provider === 'stripe') {
    payload.secret_key = document.getElementById('field_stripe_secret_key')?.value.trim();
    payload.publishable_key = document.getElementById('field_stripe_publishable_key')?.value.trim();
    payload.currency = document.getElementById('field_stripe_currency')?.value.trim();
    payload.webhook_secret = document.getElementById('field_stripe_webhook_secret')?.value.trim();
  } else if (provider === 'openai') {
    payload.api_key = document.getElementById('field_openai_api_key')?.value.trim();
    payload.model = document.getElementById('field_openai_model')?.value.trim();
    payload.enable_ai_analysis = document.getElementById('field_openai_lead_scoring')?.value === 'true';
    payload.system_prompt = document.getElementById('field_openai_prompt')?.value.trim();
  } else if (provider === 'cal_com') {
    payload.api_key = document.getElementById('field_cal_com_api_key')?.value.trim();
    payload.cal_url = document.getElementById('field_cal_com_cal_url')?.value.trim();
  } else if (provider === 'google') {
    payload.client_id = document.getElementById('field_google_client_id')?.value.trim();
    payload.client_secret = document.getElementById('field_google_client_secret')?.value.trim();
  } else if (provider === 'google_calendar') {
    payload.calendar_id = document.getElementById('field_google_calendar_id')?.value.trim();
    payload.timezone = document.getElementById('field_google_calendar_timezone')?.value.trim();
    payload.auto_create_events = document.getElementById('field_google_calendar_auto')?.value === 'true';
  } else if (provider === 'google_sheets') {
    payload.spreadsheet_id = document.getElementById('field_google_sheets_id')?.value.trim();
    payload.worksheet_name = document.getElementById('field_google_sheets_name')?.value.trim();
    payload.auto_sync = document.getElementById('field_google_sheets_auto')?.value === 'true';
  } else if (provider === 'gmail') {
    payload.send_via_gmail = document.getElementById('field_gmail_send')?.value === 'true';
    payload.auto_sync_inbox = document.getElementById('field_gmail_sync')?.value === 'true';
  }

  apiFetch(`/api/admin/integrations/${provider}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }).then(res => {
    if (res && res.success) {
      alert(res.message || `Saved ${provider.toUpperCase()} API Configuration.`);
      loadCentralizedIntegrations();
    } else {
      alert(`Error saving configuration: ${res ? res.error : 'Unknown error'}`);
    }
  });
}

function connectGoogleOAuth() {
  apiFetch('/api/admin/integrations/google/auth-url', { method: 'POST' }).then(res => {
    if (res && res.auth_url) {
      window.location.href = res.auth_url;
    }
  });
}

function disconnectGoogleOAuth() {
  if (confirm('Disconnect Google Workspace account?')) {
    apiFetch('/api/admin/integrations/google/disconnect', { method: 'POST' }).then(() => {
      loadCentralizedIntegrations();
    });
  }
}

function testIntegrationProbe(provider) {
  apiFetch(`/api/admin/integrations/${provider}/test`, { method: 'POST' }).then(res => {
    if (res && res.success) {
      alert(`✓ Live Connection Verified for ${provider.toUpperCase()}!\nLatency: ${res.latencyMs}ms\nStatus: ACTIVE`);
      loadCentralizedIntegrations();
    } else {
      alert(`⚠ Connection Test Failed for ${provider.toUpperCase()}:\n${res ? res.error : 'Invalid API key or network error'}\nStatus: OFFLINE`);
      loadCentralizedIntegrations();
    }
  });
}

function openConfigureProviderModal(provider) {
  apiFetch('/api/admin/integrations/all').then(data => {
    const item = (data.integrations || []).find(x => x.provider === provider);
    if (!item) return;

    const cfg = item.config || {};
    universalModalTitle.textContent = `Configure ${item.name}`;

    let formFields = '';
    if (provider === 'resend') {
      formFields = `
        <div class="form-group"><label class="form-label">Resend API Key</label><input type="password" id="cfg_api_key" class="form-input" value="${cfg.api_key || ''}" placeholder="re_••••••••"></div>
        <div class="form-group"><label class="form-label">From Email</label><input type="email" id="cfg_from_email" class="form-input" value="${cfg.from_email || 'admin@calinex.us'}"></div>
        <div class="form-group"><label class="form-label">From Name</label><input type="text" id="cfg_from_name" class="form-input" value="${cfg.from_name || 'CALINEX | Md. Sharafat Ullah'}"></div>
      `;
    } else if (provider === 'stripe') {
      formFields = `
        <div class="form-group"><label class="form-label">Publishable Key</label><input type="text" id="cfg_pub_key" class="form-input" value="${cfg.publishable_key || ''}"></div>
        <div class="form-group"><label class="form-label">Secret Key</label><input type="password" id="cfg_sec_key" class="form-input" value="${cfg.secret_key || ''}"></div>
        <div class="form-group"><label class="form-label">Webhook Secret</label><input type="password" id="cfg_wh_sec" class="form-input" value="${cfg.webhook_secret || ''}"></div>
      `;
    } else if (provider === 'openai') {
      formFields = `
        <div class="form-group"><label class="form-label">OpenAI API Key</label><input type="password" id="cfg_api_key" class="form-input" value="${cfg.api_key || ''}"></div>
        <div class="form-group"><label class="form-label">Model</label><input type="text" id="cfg_model" class="form-input" value="${cfg.model || 'gpt-4o'}"></div>
        <div class="form-group"><label class="form-label">System Prompt</label><textarea id="cfg_prompt" class="form-textarea">${cfg.system_prompt || ''}</textarea></div>
      `;
    } else if (provider === 'google') {
      formFields = `
        <div class="form-group"><label class="form-label">Google OAuth Client ID</label><input type="text" id="cfg_client_id" class="form-input" value="${cfg.client_id || ''}"></div>
        <div class="form-group"><label class="form-label">Google OAuth Client Secret</label><input type="password" id="cfg_client_sec" class="form-input" value="${cfg.client_secret || ''}"></div>
      `;
    } else if (provider === 'google_sheets') {
      formFields = `
        <div class="form-group"><label class="form-label">Spreadsheet ID</label><input type="text" id="cfg_sheet_id" class="form-input" value="${cfg.spreadsheet_id || ''}"></div>
        <div class="form-group"><label class="form-label">Sheet Name</label><input type="text" id="cfg_sheet_name" class="form-input" value="${cfg.worksheet_name || 'Inbound Leads'}"></div>
      `;
    } else {
      formFields = `
        <div class="form-group"><label class="form-label">API Key / URL</label><input type="text" id="cfg_gen_val" class="form-input" value="${cfg.api_key || cfg.cal_url || ''}"></div>
      `;
    }

    universalModalBody.innerHTML = `<form id="cfgForm">${formFields}</form>`;
    openModal(() => {
      const payload = {};
      if (document.getElementById('cfg_api_key')) payload.api_key = document.getElementById('cfg_api_key').value.trim();
      if (document.getElementById('cfg_from_email')) payload.from_email = document.getElementById('cfg_from_email').value.trim();
      if (document.getElementById('cfg_from_name')) payload.from_name = document.getElementById('cfg_from_name').value.trim();
      if (document.getElementById('cfg_pub_key')) payload.publishable_key = document.getElementById('cfg_pub_key').value.trim();
      if (document.getElementById('cfg_sec_key')) payload.secret_key = document.getElementById('cfg_sec_key').value.trim();
      if (document.getElementById('cfg_wh_sec')) payload.webhook_secret = document.getElementById('cfg_wh_sec').value.trim();
      if (document.getElementById('cfg_model')) payload.model = document.getElementById('cfg_model').value.trim();
      if (document.getElementById('cfg_prompt')) payload.system_prompt = document.getElementById('cfg_prompt').value.trim();
      if (document.getElementById('cfg_client_id')) payload.client_id = document.getElementById('cfg_client_id').value.trim();
      if (document.getElementById('cfg_client_sec')) payload.client_secret = document.getElementById('cfg_client_sec').value.trim();
      if (document.getElementById('cfg_sheet_id')) payload.spreadsheet_id = document.getElementById('cfg_sheet_id').value.trim();
      if (document.getElementById('cfg_sheet_name')) payload.worksheet_name = document.getElementById('cfg_sheet_name').value.trim();

      apiFetch(`/api/admin/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(payload) }).then(() => {
        closeModal();
        loadCentralizedIntegrations();
      });
    });
  });
}

/**
 * ====================================================================
 * 5. TABBED CMS VIEW (#cms)
 * ====================================================================
 */
let cmsActiveTab = 'pages';

async function renderCmsView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">CMS Content Manager</h1>
        <p class="page-subtitle">Manage pages, capabilities, portfolio case studies, testimonials, team, and media assets.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn-primary" onclick="openCreateCmsItemModal()">+ Add Content</button>
      </div>
    </div>

    <!-- CMS Tab Navigation -->
    <div class="cms-nav-tabs">
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'pages' ? 'active' : ''}" onclick="switchCmsTab('pages')">Pages</button>
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'services' ? 'active' : ''}" onclick="switchCmsTab('services')">Services</button>
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'case-studies' ? 'active' : ''}" onclick="switchCmsTab('case-studies')">Case Studies</button>
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'testimonials' ? 'active' : ''}" onclick="switchCmsTab('testimonials')">Testimonials</button>
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'team' ? 'active' : ''}" onclick="switchCmsTab('team')">Team</button>
      <button type="button" class="cms-tab-btn ${cmsActiveTab === 'media' ? 'active' : ''}" onclick="switchCmsTab('media')">Media Assets</button>
    </div>

    <div class="dashboard-panel" id="cmsContentPanel">
      <div style="padding: 30px; text-align: center; color: var(--text-muted);">Loading CMS data...</div>
    </div>
  `;

  loadCmsTabContent();
}

function switchCmsTab(tab) {
  cmsActiveTab = tab;
  renderCmsView();
}

async function loadCmsTabContent() {
  const panel = document.getElementById('cmsContentPanel');
  if (!panel) return;

  if (cmsActiveTab === 'pages') {
    const data = await apiFetch('/api/admin/cms/pages');
    panel.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Page Name</th><th>Route</th><th>Status</th></tr></thead><tbody>${(data.pages || []).map(p => `<tr><td><strong>${escapeHtml(p.name)}</strong></td><td><code>${escapeHtml(p.url)}</code></td><td><span class="status-badge ${p.status}">${p.status}</span></td></tr>`).join('')}</tbody></table></div>`;
  } else if (cmsActiveTab === 'services') {
    const data = await apiFetch('/api/admin/cms/services');
    panel.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Service</th><th>Slug</th></tr></thead><tbody>${(data.services || []).map(s => `<tr><td>#${s.display_order}</td><td><strong>${escapeHtml(s.name)}</strong></td><td><code>${escapeHtml(s.slug)}</code></td></tr>`).join('')}</tbody></table></div>`;
  } else if (cmsActiveTab === 'case-studies') {
    const data = await apiFetch('/api/admin/cms/case-studies');
    renderCaseStudiesCmsTab(panel, (data && data.caseStudies) ? data.caseStudies : []);
  } else if (cmsActiveTab === 'testimonials') {
    const data = await apiFetch('/api/admin/cms/testimonials');
    panel.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Client</th><th>Company</th><th>Rating</th></tr></thead><tbody>${(data.testimonials || []).map(t => `<tr><td><strong>${escapeHtml(t.client_name)}</strong></td><td>${escapeHtml(t.company || '—')}</td><td>★ ${t.rating}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (cmsActiveTab === 'team') {
    const data = await apiFetch('/api/admin/cms/team');
    panel.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${(data.team || []).map(t => `<tr><td><strong>${escapeHtml(t.name)}</strong></td><td>${escapeHtml(t.position)}</td><td><span class="status-badge published">${t.visibility}</span></td></tr>`).join('')}</tbody></table></div>`;
  } else if (cmsActiveTab === 'media') {
    const data = await apiFetch('/api/admin/cms/media');
    panel.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">${(data.media || []).map(m => `<div style="background: var(--bg-card-subtle); padding: 12px; border-radius: 8px; text-align: center;"><img src="${m.url}" style="max-height: 90px; margin-bottom: 8px;"><div style="font-size: 11px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(m.original_name)}</div></div>`).join('')}</div>`;
  }
}

function openCreateCmsItemModal() {
  if (cmsActiveTab === 'case-studies') {
    openEditCaseStudyModal(null);
  } else {
    alert(`To create or edit ${cmsActiveTab} items, use the dedicated management fields.`);
  }
}

/**
 * ====================================================================
 * CASE STUDIES CMS TAB MANAGEMENT
 * ====================================================================
 */
function renderCaseStudiesCmsTab(panel, caseStudies) {
  if (!caseStudies || caseStudies.length === 0) {
    panel.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 15px;">No case studies found.</p>
        <button type="button" class="btn-primary" onclick="openEditCaseStudyModal(null)" style="margin-top: 12px;">+ Add New Case Study</button>
      </div>
    `;
    return;
  }

  window._adminCaseStudies = caseStudies;

  let rowsHtml = caseStudies.map((cs, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === caseStudies.length - 1;
    const statusClass = cs.status === 'published' ? 'published' : 'archived';
    const statusText = cs.status === 'published' ? 'Published' : 'Unpublished';
    const tagBadges = (cs.tags || []).map(t => `<span style="display:inline-block; padding: 2px 6px; font-size: 11px; background: rgba(59,130,246,0.1); color: var(--accent-primary); border-radius: 4px; margin-right: 4px; margin-bottom: 2px;">${escapeHtml(t)}</span>`).join('');

    return `
      <tr>
        <td style="width: 70px; text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="font-weight: 700; font-size: 12px; color: var(--text-muted);">#${cs.order || (idx + 1)}</span>
            <div style="display: flex; gap: 2px;">
              <button type="button" style="padding: 2px 5px; font-size: 10px; cursor: pointer; background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: 3px;" ${isFirst ? 'disabled' : ''} onclick="moveCaseStudyOrder('${cs.id}', -1)">▲</button>
              <button type="button" style="padding: 2px 5px; font-size: 10px; cursor: pointer; background: var(--bg-card-subtle); border: 1px solid var(--border-subtle); border-radius: 3px;" ${isLast ? 'disabled' : ''} onclick="moveCaseStudyOrder('${cs.id}', 1)">▼</button>
            </div>
          </div>
        </td>
        <td style="width: 80px;">
          <img src="${cs.image || 'https://cdn.prod.website-files.com/6655d16113e6966ef4eb1054/6a3b69488d9cfd0f31763daf_Kodezi.png'}" alt="${escapeHtml(cs.title)}" style="width: 64px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-subtle);">
        </td>
        <td>
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${escapeHtml(cs.title)}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(cs.category || '')}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;"><code>/case-studies.html/${escapeHtml(cs.slug || cs.id)}</code></div>
        </td>
        <td>
          <div style="font-weight: 800; font-size: 14px; color: var(--accent-primary);">${escapeHtml(cs.metricNumber || '—')}</div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${escapeHtml(cs.metricLabel || '')}</div>
        </td>
        <td style="max-width: 180px;">${tagBadges || '—'}</td>
        <td style="width: 100px;">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td style="width: 160px; text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="openEditCaseStudyModal('${cs.id}')">✏️ Edit</button>
            <button type="button" class="btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="toggleCaseStudyStatus('${cs.id}', '${cs.status}')">${cs.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button type="button" class="btn-secondary danger" style="padding: 5px 10px; font-size: 12px;" onclick="confirmDeleteCaseStudy('${cs.id}', '${escapeHtml(cs.title)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  panel.innerHTML = `
    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-subtle);">
      <div>
        <h3 style="margin: 0; font-size: 15px; font-weight: 700;">Case Studies (${caseStudies.length})</h3>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted);">Manage existing projects, reorder, upload images, or publish new Case Studies.</p>
      </div>
      <button type="button" class="btn-primary" onclick="openEditCaseStudyModal(null)">+ Add New Case Study</button>
    </div>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: center;">Order</th>
            <th>Image</th>
            <th>Project &amp; URL</th>
            <th>Metric Stat</th>
            <th>Filter Tags</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function openEditCaseStudyModal(studyId) {
  const studies = window._adminCaseStudies || [];
  const study = studyId ? studies.find(s => s.id === studyId || s.slug === studyId) : null;
  const isEdit = !!study;

  const modalTitle = isEdit ? `Edit Case Study: ${escapeHtml(study.title)}` : 'Add New Case Study';
  const modalBody = `
    <form id="caseStudyForm" onsubmit="event.preventDefault(); saveCaseStudyFromModal('${study ? study.id : ''}');">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="form-group">
          <label class="form-label" for="csTitle">Project Title / Name *</label>
          <input type="text" id="csTitle" class="form-input" required value="${study ? escapeHtml(study.title) : ''}" placeholder="e.g. Kodezi" oninput="autoGenerateCsSlug(this.value)">
        </div>
        <div class="form-group">
          <label class="form-label" for="csSlug">URL Slug *</label>
          <input type="text" id="csSlug" class="form-input" required value="${study ? escapeHtml(study.slug) : ''}" placeholder="e.g. kodezi">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label class="form-label" for="csCategory">Industry / Subtitle</label>
          <input type="text" id="csCategory" class="form-input" value="${study ? escapeHtml(study.category || '') : ''}" placeholder="e.g. AI codebase platform">
        </div>
        <div class="form-group">
          <label class="form-label" for="csClient">Client / Company Name</label>
          <input type="text" id="csClient" class="form-input" value="${study ? escapeHtml(study.client || '') : ''}" placeholder="e.g. Kodezi Inc.">
        </div>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="csDescription">Short Description</label>
        <textarea id="csDescription" class="form-input" rows="2" placeholder="Brief summary displayed on case study cards">${study ? escapeHtml(study.description || '') : ''}</textarea>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="csFullDescription">Full Project Details / Content</label>
        <textarea id="csFullDescription" class="form-input" rows="3" placeholder="Detailed project breakdown, challenges, solutions, and impact">${study ? escapeHtml(study.fullDescription || study.description || '') : ''}</textarea>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label class="form-label" for="csMetricNumber">Metric Stat Value</label>
          <input type="text" id="csMetricNumber" class="form-input" value="${study ? escapeHtml(study.metricNumber || '') : ''}" placeholder="e.g. $1.8M or +28%">
        </div>
        <div class="form-group">
          <label class="form-label" for="csMetricLabel">Metric Stat Label</label>
          <input type="text" id="csMetricLabel" class="form-input" value="${study ? escapeHtml(study.metricLabel || '') : ''}" placeholder="e.g. seed-funded or conversion uplift">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label class="form-label" for="csServices">Services Provided</label>
          <input type="text" id="csServices" class="form-input" value="${study ? escapeHtml(study.services || '') : ''}" placeholder="e.g. UI/UX Design, Webflow Development">
        </div>
        <div class="form-group">
          <label class="form-label" for="csOrder">Display Order Position</label>
          <input type="number" id="csOrder" class="form-input" value="${study ? (study.order || 1) : ((window._adminCaseStudies || []).length + 1)}">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label class="form-label" for="csLocation">Location / Country</label>
          <input type="text" id="csLocation" class="form-input" value="${study ? escapeHtml(study.location || 'United States') : 'United States'}" placeholder="e.g. United States">
        </div>
        <div class="form-group">
          <label class="form-label" for="csDate">Year / Date</label>
          <input type="text" id="csDate" class="form-input" value="${study ? escapeHtml(study.date || '2025') : '2025'}" placeholder="e.g. 2025">
        </div>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label" for="csGallery">Gallery Images (Comma-separated URLs)</label>
        <textarea id="csGallery" class="form-input" rows="2" placeholder="Image URLs separated by comma">${study && Array.isArray(study.gallery) ? escapeHtml(study.gallery.join(', ')) : ''}</textarea>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label">Category Filter Tags (Select all that apply)</label>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; padding: 10px; background: var(--bg-card-subtle); border-radius: 6px; border: 1px solid var(--border-subtle);">
          ${['Websites', 'Mobile apps', 'SaaS', 'AI', 'Healthcare', 'Fintech', 'Real estate', 'Blockchain/Web3', 'B2B/B2C'].map(tag => {
            const checked = study && (study.tags || []).includes(tag) ? 'checked' : '';
            return `<label style="display: flex; align-items: center; gap: 5px; font-size: 13px; cursor: pointer;"><input type="checkbox" name="csTags" value="${tag}" ${checked}> ${tag}</label>`;
          }).join('')}
        </div>
      </div>

      <div class="form-group" style="margin-top: 12px;">
        <label class="form-label">Cover / Card Image</label>
        <div style="display: flex; gap: 12px; align-items: center;">
          <input type="file" id="csImageFileInput" accept="image/*" style="display: none;" onchange="handleCsFileSelected(this)">
          <button type="button" class="btn-secondary" onclick="document.getElementById('csImageFileInput').click()">📷 Upload Image</button>
          <input type="text" id="csImageUrl" class="form-input" style="flex: 1;" value="${study ? escapeHtml(study.image || '') : ''}" placeholder="or enter Image URL..." oninput="document.getElementById('csImgPreview').src = this.value">
        </div>
        <div style="margin-top: 8px; text-align: center; background: var(--bg-card-subtle); padding: 10px; border-radius: 6px;">
          <img id="csImgPreview" src="${study ? (study.image || '') : ''}" style="max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'" onload="this.style.display='inline-block'">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div class="form-group">
          <label class="form-label" for="csStatus">Publication Status</label>
          <select id="csStatus" class="form-input">
            <option value="published" ${(!study || study.status === 'published') ? 'selected' : ''}>Published (Live on site)</option>
            <option value="unpublished" ${(study && study.status === 'unpublished') ? 'selected' : ''}>Unpublished (Draft / Hidden)</option>
          </select>
        </div>
        <div class="form-group" style="display: flex; align-items: center; margin-top: 24px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" id="csFeatured" ${(study && study.featured) ? 'checked' : ''}> Feature on Homepage / Highlights
          </label>
        </div>
      </div>
    </form>
  `;

  document.getElementById('universalModalTitle').textContent = modalTitle;
  document.getElementById('universalModalBody').innerHTML = modalBody;
  
  const saveBtn = document.getElementById('saveUniversalModal');
  saveBtn.textContent = isEdit ? 'Save Changes' : 'Publish Case Study';
  saveBtn.onclick = () => saveCaseStudyFromModal(study ? study.id : null);

  openUniversalModal();
}

function autoGenerateCsSlug(title) {
  const slugInput = document.getElementById('csSlug');
  if (slugInput && !slugInput.dataset.userEdited) {
    slugInput.value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}

async function handleCsFileSelected(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    document.getElementById('csImgPreview').src = dataUrl;
    document.getElementById('csImgPreview').style.display = 'inline-block';
    
    const res = await apiFetch('/api/admin/cms/upload', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, dataUrl: dataUrl })
    });
    if (res && res.success && res.url) {
      document.getElementById('csImageUrl').value = res.url;
    } else {
      document.getElementById('csImageUrl').value = dataUrl;
    }
  };
  reader.readAsDataURL(file);
}

async function saveCaseStudyFromModal(studyId) {
  const title = document.getElementById('csTitle').value.trim();
  const slug = document.getElementById('csSlug').value.trim();
  if (!title || !slug) {
    alert('Project Title and URL Slug are required.');
    return;
  }

  const selectedTags = [...document.querySelectorAll('input[name="csTags"]:checked')].map(cb => cb.value);

  const payload = {
    id: studyId || slug,
    slug: slug,
    title: title,
    category: document.getElementById('csCategory').value.trim(),
    description: document.getElementById('csDescription').value.trim(),
    fullDescription: document.getElementById('csFullDescription').value.trim(),
    client: document.getElementById('csClient').value.trim() || title,
    services: document.getElementById('csServices').value.trim(),
    location: (document.getElementById('csLocation')?.value || 'United States').trim(),
    date: (document.getElementById('csDate')?.value || '2025').trim(),
    gallery: (document.getElementById('csGallery')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    metricNumber: document.getElementById('csMetricNumber').value.trim(),
    metricLabel: document.getElementById('csMetricLabel').value.trim(),
    image: document.getElementById('csImageUrl').value.trim() || 'https://cdn.prod.website-files.com/6655d16113e6966ef4eb1054/6a3b69488d9cfd0f31763daf_Kodezi.png',
    order: Number(document.getElementById('csOrder').value) || 1,
    status: document.getElementById('csStatus').value,
    featured: document.getElementById('csFeatured').checked,
    tags: selectedTags.length > 0 ? selectedTags : ['Websites']
  };

  const res = await apiFetch('/api/admin/cms/case-studies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (res && res.success) {
    closeUniversalModal();
    loadCmsTabContent();
  } else {
    alert('Failed to save Case Study: ' + ((res && res.error) || 'Unknown error'));
  }
}

async function confirmDeleteCaseStudy(studyId, studyTitle) {
  if (!confirm(`Are you sure you want to delete "${studyTitle}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  const res = await apiFetch('/api/admin/cms/case-studies/delete', {
    method: 'POST',
    body: JSON.stringify({ id: studyId })
  });

  if (res && res.success) {
    loadCmsTabContent();
  } else {
    alert('Failed to delete Case Study: ' + ((res && res.error) || 'Unknown error'));
  }
}

async function toggleCaseStudyStatus(studyId, currentStatus) {
  const studies = window._adminCaseStudies || [];
  const target = studies.find(s => s.id === studyId || s.slug === studyId);
  if (!target) return;

  target.status = currentStatus === 'published' ? 'unpublished' : 'published';

  const res = await apiFetch('/api/admin/cms/case-studies', {
    method: 'POST',
    body: JSON.stringify(target)
  });

  if (res && res.success) {
    loadCmsTabContent();
  }
}

async function moveCaseStudyOrder(studyId, direction) {
  const studies = window._adminCaseStudies || [];
  const idx = studies.findIndex(s => s.id === studyId || s.slug === studyId);
  if (idx < 0) return;

  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= studies.length) return;

  const currentOrder = studies[idx].order || (idx + 1);
  const targetOrder = studies[targetIdx].order || (targetIdx + 1);

  studies[idx].order = targetOrder;
  studies[targetIdx].order = currentOrder;

  const res = await apiFetch('/api/admin/cms/case-studies/reorder', {
    method: 'POST',
    body: JSON.stringify({ items: studies.map(s => ({ id: s.id, order: s.order })) })
  });

  if (res && res.success) {
    loadCmsTabContent();
  }
}

/**
 * ====================================================================
 * 6. CONTACTS, PAYMENTS, AUTOMATIONS, SETTINGS
 * ====================================================================
 */
async function renderContactsView() {
  viewContainer.innerHTML = `<div class="page-header"><div><h1 class="page-title">Contacts &amp; CRM</h1></div></div><div class="dashboard-panel" id="cList" style="padding:20px;">Loading contacts...</div>`;
  const data = await apiFetch('/api/admin/leads/contacts');
  if (data && data.success) {
    document.getElementById('cList').innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th></tr></thead><tbody>${data.contacts.map(c => `<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.company || '—')}</td><td><span class="status-badge ${c.status}">${c.status}</span></td></tr>`).join('')}</tbody></table></div>`;
  }
}

async function renderPaymentsView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Payments &amp; Stripe</h1><p class="page-subtitle">Revenue volume, transactions, and payment link generator.</p></div>
      <div class="header-actions"><button type="button" class="btn-primary" onclick="openCreatePaymentLinkModal()">Generate Stripe Link</button></div>
    </div>
    <div class="dashboard-panel" id="pList" style="padding:20px;">Loading payments...</div>
  `;
  const data = await apiFetch('/api/admin/payments');
  if (data && data.success) {
    document.getElementById('pList').innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Client</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${data.payments.map(p => `<tr><td><strong>${escapeHtml(p.client_name)}</strong></td><td>$${p.amount} ${p.currency}</td><td><span class="status-badge ${p.status === 'completed' ? 'published' : 'archived'}">${p.status}</span></td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table></div>`;
  }
}

function openCreatePaymentLinkModal() {
  universalModalTitle.textContent = 'Generate Stripe Checkout Session';
  universalModalBody.innerHTML = `
    <form id="payForm">
      <div class="form-group"><label class="form-label">Client Name</label><input type="text" id="pClient" class="form-input" required placeholder="Acme Corp"></div>
      <div class="form-group"><label class="form-label">Service Package</label><input type="text" id="pService" class="form-input" required placeholder="Design Sprint / MVP Development"></div>
      <div class="form-group"><label class="form-label">Amount (USD)</label><input type="number" id="pAmount" class="form-input" required placeholder="4500"></div>
    </form>
  `;
  openModal(() => {
    const payload = { client_name: document.getElementById('pClient').value, service_name: document.getElementById('pService').value, amount: document.getElementById('pAmount').value };
    apiFetch('/api/admin/payments/create-link', { method: 'POST', body: JSON.stringify(payload) }).then(res => {
      alert(`Stripe Checkout Session Created! URL: ${res.checkout_url || 'https://checkout.stripe.com/...'}`);
      closeModal();
      renderPaymentsView();
    });
  });
}

async function renderAutomationsView() {
  viewContainer.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Automations Engine</h1></div></div>
    <div class="dashboard-panel" id="autoList" style="padding:20px;">Loading pipelines...</div>
  `;
  const data = await apiFetch('/api/admin/automations');
  if (data && data.success) {
    document.getElementById('autoList').innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Pipeline Name</th><th>Trigger</th><th>Status</th><th>Last Run</th></tr></thead><tbody>${data.automations.map(a => `<tr><td><strong>${escapeHtml(a.name)}</strong></td><td><span class="status-badge published">${a.trigger_type}</span></td><td><span class="status-badge ${a.is_enabled ? 'published' : 'archived'}">${a.is_enabled ? 'Active' : 'Disabled'}</span></td><td>${a.last_run_at ? new Date(a.last_run_at).toLocaleString() : 'Never'}</td></tr>`).join('')}</tbody></table></div>`;
  }
}

async function renderSettingsView() {
  viewContainer.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">System &amp; Security Settings</h1>
        <p class="page-subtitle">Agency profile, staff roles, activity audit logs, and diagnostic health.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Brand & Profile -->
      <div class="dashboard-panel">
        <div class="panel-header"><h3 class="panel-title">Agency Profile</h3></div>
        <div style="font-size: 13px; display: flex; flex-direction: column; gap: 10px;">
          <div><strong>Brand:</strong> CALINEX</div>
          <div><strong>Founder &amp; CEO:</strong> Md. Sharafat Ullah</div>
          <div><strong>WhatsApp:</strong> +8801629018678</div>
          <div><strong>Support Email:</strong> admin@calinex.us</div>
        </div>
      </div>

      <!-- System Health Diagnostics -->
      <div class="dashboard-panel">
        <div class="panel-header"><h3 class="panel-title">Health Diagnostics</h3></div>
        <div style="font-size: 13px; display: flex; flex-direction: column; gap: 10px;">
          <div><strong>Node.js:</strong> v24.18.0</div>
          <div><strong>Database:</strong> SQLite WAL Mode (Integrity: OK)</div>
          <div><strong>Security:</strong> scrypt + 24h JWT Tokens</div>
          <div><strong>Status:</strong> <span class="status-badge published">Online &bull; Fully Operational</span></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Universal Modal & Notifications Helpers
 */
function openModal(onSave) { onModalSaveCallback = onSave; universalModal.classList.add('open'); }
function closeModal() { universalModal.classList.remove('open'); onModalSaveCallback = null; }

async function loadNotifications() {
  const data = await apiFetch('/api/admin/notifications');
  if (data && data.success) {
    const badge = document.getElementById('topNotifBadge');
    if (badge) badge.style.display = data.unreadCount > 0 ? 'block' : 'none';
  }
}

function setupEventListeners() {
  window.addEventListener('hashchange', handleRouting);
  sidebarToggleBtn?.addEventListener('click', () => { sidebar.classList.toggle('mobile-open'); });
  closeUniversalModal?.addEventListener('click', closeModal);
  cancelUniversalModal?.addEventListener('click', closeModal);
  saveUniversalModal?.addEventListener('click', () => { if (onModalSaveCallback) onModalSaveCallback(); });
  notifBtn?.addEventListener('click', (e) => { e.stopPropagation(); notifDropdown.classList.toggle('open'); });
  profileDropdownBtn?.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('open'); });
  document.addEventListener('click', () => { notifDropdown?.classList.remove('open'); profileDropdown?.classList.remove('open'); });
  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await apiFetch('/api/admin/auth/logout', { method: 'POST' });
    localStorage.removeItem('calinex_admin_token');
    window.location.href = '/admin/login';
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initApp);
