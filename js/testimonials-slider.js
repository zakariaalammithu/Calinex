/**
 * Testimonial Infinite Slider & Smooth Scrolling
 * Auto-scrolls from right to left with pause on hover and drag support
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('wsReviewsSlider');
  const track = document.getElementById('wsReviewsTrack');
  const dots = document.querySelectorAll('.ws_dot');
  if (!container || !track) return;

  const cards = track.querySelectorAll('.tes_card_slide');
  if (!cards.length) return;

  let currentIndex = 0;
  let isDown = false;
  let startX;
  let scrollLeft;
  let autoScrollTimer = null;

  function getCardWidth() {
    return cards[0].offsetWidth;
  }

  function scrollToCard(index) {
    if (index < 0) index = 0;
    if (index >= cards.length) index = 0;
    currentIndex = index;

    const offset = index * getCardWidth();
    track.style.transform = `translateX(-${offset}px)`;

    dots.forEach((d, i) => {
      d.classList.toggle('is_active', i === index);
    });
  }

  // Dot Click Handlers
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      scrollToCard(i);
      resetAutoPlay();
    });
  });

  // Drag Support
  container.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    clearInterval(autoScrollTimer);
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    resetAutoPlay();
  });

  container.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false;
      resetAutoPlay();
    }
  });

  // Touch Support
  let touchStartX = 0;
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    clearInterval(autoScrollTimer);
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        scrollToCard(currentIndex + 1);
      } else {
        scrollToCard(currentIndex - 1);
      }
    }
    resetAutoPlay();
  }, { passive: true });

  // Auto-scroll loop: Advances every 3.5 seconds
  function startAutoPlay() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % cards.length;
      scrollToCard(currentIndex);
    }, 3500);
  }

  function resetAutoPlay() {
    startAutoPlay();
  }

  container.addEventListener('mouseenter', () => {
    clearInterval(autoScrollTimer);
  });

  container.addEventListener('mouseleave', () => {
    startAutoPlay();
  });

  // Initialize
  scrollToCard(0);
  startAutoPlay();
});
