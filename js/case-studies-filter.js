/**
 * Interactive Filter Tabs for Case Studies Page
 */
document.addEventListener('DOMContentLoaded', () => {
  const filterTabs = document.querySelectorAll('.cs-tab-link');
  const allCards = document.querySelectorAll('.cs-items');

  if (!filterTabs.length || !allCards.length) return;

  // Initialize keyword search indexing on all cards
  allCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.setAttribute('data-keywords', text);
  });

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 1. Set active pill state
      filterTabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      // 2. Determine filter category
      const filter = (tab.getAttribute('data-filter') || '').toLowerCase().trim();

      // 3. Filter cards
      allCards.forEach(card => {
        if (filter === 'all' || !filter) {
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
});
