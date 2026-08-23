/**
 * Interactive Video Testimonials Accordion
 */
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('ws-testimonials');
  if (!wrapper) return;

  const cards = wrapper.querySelectorAll('[data-card]');

  cards.forEach((card) => {
    const video = card.querySelector('[data-video]');
    const closeBtn = card.querySelector('[data-close]');
    const playBtn = card.querySelector('.ws-play');

    // Muted preview function
    function preview() {
      if (!video) return;
      video.muted = true;
      const p = video.play();
      if (p) p.catch(() => {});
      card.classList.add('is-preview');
    }
    card._preview = preview;

    // Start muted preview
    preview();

    // Click handler on card to activate and unmute
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) return;

      // If already active, toggle play/pause
      if (card.classList.contains('is-active')) {
        if (video.paused) {
          video.play();
          card.classList.add('is-playing');
        } else {
          video.pause();
          card.classList.remove('is-playing');
        }
        return;
      }

      // Deactivate others
      cards.forEach((c) => {
        if (c === card) return;
        const v = c.querySelector('[data-video]');
        c.classList.remove('is-active', 'is-playing');
        if (v) {
          v.muted = true;
          c._preview && c._preview();
        }
      });

      // Activate clicked card
      card.classList.remove('is-preview');
      card.classList.add('is-active');
      wrapper.classList.add('has-active');

      video.currentTime = 0;
      video.muted = false;
      const p = video.play();
      if (p) {
        p.then(() => { card.classList.add('is-playing'); })
         .catch(() => {
           video.muted = true;
           video.play().catch(() => {});
         });
      }
    });

    // Close button returns to muted preview
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.remove('is-active', 'is-playing');
        wrapper.classList.remove('has-active');
        if (video) {
          video.muted = true;
          card._preview && card._preview();
        }
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.click();
      });
    }
  });

  // IntersectionObserver to pause when out of viewport
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          cards.forEach((c) => {
            if (!c.classList.contains('is-active')) c._preview && c._preview();
          });
        } else {
          cards.forEach((c) => {
            if (!c.classList.contains('is-active')) {
              const v = c.querySelector('[data-video]');
              if (v) v.pause();
              c.classList.remove('is-preview');
            }
          });
        }
      });
    }, { threshold: 0.1 });
    io.observe(wrapper);
  }
});
