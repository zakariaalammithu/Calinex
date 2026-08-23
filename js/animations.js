/**
 * Advanced Animations & Scroll Engine for Wavespace / CALINEX
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Viewport Scroll Reveal Observer
  const revealElements = document.querySelectorAll(
    '.hero_content, .data_card-2, .cs-card-lg, .cs-card-md, .award_card, .ind-card, .trad-content-wrap, .singel_tab_wrap, .loc_card'
  );

  revealElements.forEach(el => el.classList.add('reveal-fade-up'));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-revealed'));
  }

  // 2. Floating Form Input Labels
  document.querySelectorAll('.form-input').forEach(input => {
    const label = input.closest('.c_input-wrap')?.querySelector('.form-label');
    if (!label) return;

    const updateLabel = () => {
      if (input.value.trim() !== '') {
        label.classList.add('focus-in');
      } else {
        label.classList.remove('focus-in');
      }
    };

    input.addEventListener('input', updateLabel);
    input.addEventListener('focusin', () => {
      label.style.color = '#2a1ad4';
      label.classList.add('focus-in');
    });
    input.addEventListener('focusout', () => {
      label.style.color = '';
      updateLabel();
    });
    updateLabel();
  });

  // 3. Smooth Sticky Card Stacking on Scroll (About Page Dark Services)
  const serviceCards = document.querySelectorAll('.service_sec.about-us .service_card_new');
  if (serviceCards.length > 0) {
    const handleCardStacking = () => {
      if (window.innerWidth <= 991) return;

      serviceCards.forEach((card, idx) => {
        const nextCard = serviceCards[idx + 1];
        if (nextCard) {
          const nextRect = nextCard.getBoundingClientRect();
          const targetTop = 100 + (idx + 1) * 15;
          
          if (nextRect.top < window.innerHeight && nextRect.top > targetTop) {
            const progress = 1 - ((nextRect.top - targetTop) / (window.innerHeight - targetTop));
            const clamped = Math.max(0, Math.min(1, progress));
            const scale = 1 - (clamped * 0.045);
            const brightness = 1 - (clamped * 0.15);
            card.style.transform = `scale(${scale})`;
            card.style.filter = `brightness(${brightness})`;
          } else if (nextRect.top <= targetTop) {
            card.style.transform = 'scale(0.955)';
            card.style.filter = 'brightness(0.85)';
          } else {
            card.style.transform = 'scale(1)';
            card.style.filter = 'brightness(1)';
          }
        }
      });
    };

    window.addEventListener('scroll', handleCardStacking, { passive: true });
    handleCardStacking();
  }

  // 4. Horizontal Sticky Scroll Animation for Process Steps ("The process behind our design of your product")
  const processSection = document.getElementById('aboutProcessSection');
  const processTrack = document.getElementById('processCardsTrack');

  if (processSection && processTrack) {
    const handleProcessScroll = () => {
      if (window.innerWidth <= 991) {
        processTrack.style.transform = 'none';
        return;
      }

      const rect = processSection.getBoundingClientRect();
      const sectionHeight = processSection.offsetHeight;
      const windowHeight = window.innerHeight;
      const totalScrollable = sectionHeight - windowHeight;

      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

      const trackWidth = processTrack.scrollWidth;
      const containerWidth = processTrack.parentElement.clientWidth;
      const maxTranslate = Math.max(0, trackWidth - containerWidth + 60);

      const currentTranslate = progress * maxTranslate;
      processTrack.style.transform = `translateX(-${currentTranslate}px)`;
    };

    window.addEventListener('scroll', handleProcessScroll, { passive: true });
    window.addEventListener('resize', handleProcessScroll, { passive: true });
    handleProcessScroll();
  }
});
