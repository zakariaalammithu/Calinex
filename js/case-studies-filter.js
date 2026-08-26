/**
 * Interactive Dynamic Hydration & Filter Tabs for Case Studies Page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.cs-items-list');

  // 1. Fetch case studies from API
  try {
    const res = await fetch('/api/public/case-studies');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.caseStudies) && data.caseStudies.length > 0) {
        renderCaseStudiesGrid(container, data.caseStudies);
      }
    }
  } catch (err) {
    console.warn('[Case Studies Dynamic Loader] API fetch notice:', err.message);
  }

  // 2. Initialize filter system on rendered cards
  initCaseStudiesFilters();
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderCaseStudiesGrid(container, caseStudies) {
  if (!container) return;

  // Filter out unpublished items just in case
  const published = caseStudies
    .filter(s => s.status !== 'unpublished')
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));

  if (!published.length) return;

  const html = published.map(cs => {
    const isLarge = cs.featured ? 'is-large' : '';
    const tagsHtml = (cs.tags || []).map(t => `<div role="listitem" class="w-dyn-item"><div fs-list-value="${escapeHtml(t)}" fs-list-field="category">${escapeHtml(t)}</div></div>`).join('');
    const linkUrl = cs.link || (`/case-studies.html/${cs.slug || cs.id}`);
    const imgSrc = cs.image || 'https://cdn.prod.website-files.com/6655d16113e6966ef4eb1054/6a3b69488d9cfd0f31763daf_Kodezi.png';

    return `
      <div role="listitem" class="cs-items w-dyn-item ${isLarge}">
        <a href="${escapeHtml(linkUrl)}" class="cs-card-lg w-inline-block">
          <div class="cs-card-contetnt">
            <div class="cs-content-flex">
              <div class="cs-card-content-cover">
                <div>
                  <div class="_12-px black">${escapeHtml(cs.category || '')}</div>
                  <div class="cs-card-logo">
                    <div class="cs-logo-text">${escapeHtml(cs.title || '')}</div>
                  </div>
                </div>
                <div class="cs-content">
                  <div class="_18-px normal">${escapeHtml(cs.description || '')}</div>
                </div>
              </div>
              <div class="matrix-button-wrap">
                <div class="stat-wrap flex">
                  <div class="text-40-px cs">${escapeHtml(cs.metricNumber || '')}</div>
                  <div class="_16-px uppercase">${escapeHtml(cs.metricLabel || '')}</div>
                </div>
                <div class="inner-container button-wrap">
                  <div class="button-arrow sm">
                    <div class="button-text">Read case study</div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 12 12" fill="none" class="arrow-16 md">
                      <path d="M11.5 6.77417L6.72534 11.5488L5.81468 10.6382L9.03469 7.41817H0.5V6.13017H9.03469L5.81468 2.91017L6.72534 1.99951L11.5 6.77417Z" fill="currentColor"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="cs-card-image">
            <img src="${escapeHtml(imgSrc)}" loading="lazy" alt="${escapeHtml(cs.title || '')}" ${cs.srcset ? `srcset="${escapeHtml(cs.srcset)}"` : ''} class="cs-image"/>
          </div>
        </a>
        <div class="filter-items-cover w-dyn-list">
          <div role="list" class="w-dyn-items">
            ${tagsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Update counter badges
  const totalBadges = document.querySelectorAll('.total_case_studies');
  totalBadges.forEach(badge => {
    badge.textContent = published.length;
  });
}

function initCaseStudiesFilters() {
  const filterTabs = document.querySelectorAll('.cs-tab-link, .testi-filter input[type="radio"], .testi-filter .cs-tab-link');
  const allCards = document.querySelectorAll('.cs-items');

  if (!allCards.length) return;

  // Index keywords for quick search & filter matching
  allCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.setAttribute('data-keywords', text);
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 1. Highlight active tab
      document.querySelectorAll('.cs-tab-link').forEach(t => t.classList.remove('is-active', 'is-list-active'));
      const activeLabel = tab.classList.contains('cs-tab-link') ? tab : tab.closest('.cs-tab-link');
      if (activeLabel) {
        activeLabel.classList.add('is-active', 'is-list-active');
      }

      // 2. Extract filter value
      let filter = (tab.getAttribute('data-filter') || tab.getAttribute('fs-list-value') || '').toLowerCase().trim();
      if (!filter) {
        const textVal = (tab.textContent || '').trim().toLowerCase();
        if (textVal.includes('all case studies') || textVal.includes('all')) {
          filter = 'all';
        } else {
          filter = textVal;
        }
      }

      // 3. Perform filtering on cards
      allCards.forEach(card => {
        if (filter === 'all' || filter === 'all case studies' || !filter) {
          card.style.display = '';
          return;
        }

        const kw = card.getAttribute('data-keywords') || '';
        let matches = false;

        if (filter === 'websites') {
          matches = kw.includes('website') || kw.includes('web design') || kw.includes('landing page');
        } else if (filter === 'mobile apps') {
          matches = kw.includes('mobile') || kw.includes('app') || kw.includes('ios') || kw.includes('android');
        } else if (filter === 'saas') {
          matches = kw.includes('saas') || kw.includes('software') || kw.includes('platform');
        } else if (filter === 'ai') {
          matches = kw.includes('ai ') || kw.includes('ai-') || kw.includes('artificial intelligence') || kw.includes('genai') || kw.includes('model');
        } else if (filter === 'healthcare') {
          matches = kw.includes('health') || kw.includes('telemedicine') || kw.includes('patient') || kw.includes('medical');
        } else if (filter === 'fintech') {
          matches = kw.includes('fintech') || kw.includes('finance') || kw.includes('payment') || kw.includes('banking');
        } else if (filter === 'real estate') {
          matches = kw.includes('real estate') || kw.includes('proptech') || kw.includes('property') || kw.includes('housing');
        } else if (filter === 'blockchain/web3') {
          matches = kw.includes('web3') || kw.includes('crypto') || kw.includes('blockchain') || kw.includes('nft');
        } else {
          matches = kw.includes(filter);
        }

        card.style.display = matches ? '' : 'none';
      });
    });
  });
}
