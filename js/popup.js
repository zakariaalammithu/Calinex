/**
 * Lead Generation Modal Popup & Call Triggers
 */
document.addEventListener('DOMContentLoaded', () => {
  const popup = document.querySelector('.page-load-popup-wrapper-new');
  const closeBtn = document.querySelector('.close-popup-new');
  const bookCallButtons = document.querySelectorAll('a[href*="cal.com"], .open-popup-btn');

  if (!popup) return;

  function openPopup(e) {
    if (e) e.preventDefault();
    popup.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closePopup() {
    popup.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Bind trigger buttons
  bookCallButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // If user wants to open modal
      if (btn.classList.contains('open-modal-trigger') || btn.getAttribute('href') === '#') {
        openPopup(e);
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }

  popup.addEventListener('click', (e) => {
    if (e.target === popup) closePopup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) closePopup();
  });
});
