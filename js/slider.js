/**
 * Testimonials Horizontal Carousel with 6 Dots, Drag, and Auto-slide
 */
document.addEventListener('DOMContentLoaded', () => {
  const sliderMask = document.getElementById('aboutTestiSliderMask');
  const dotsContainer = document.getElementById('aboutTestiDots');

  if (!sliderMask || !dotsContainer) return;

  const dots = dotsContainer.querySelectorAll('.ws_testi_dot');
  const totalDots = dots.length; // 6 dots

  let isDown = false;
  let startX;
  let scrollLeft;
  let autoTimer;
  let currentDotIndex = 0;

  const updateActiveDot = (index) => {
    currentDotIndex = index;
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('is-active');
      } else {
        dot.classList.remove('is-active');
      }
    });
  };

  const getScrollPositions = () => {
    const maxScroll = sliderMask.scrollWidth - sliderMask.clientWidth;
    return Array.from({ length: totalDots }, (_, i) => (i / (totalDots - 1)) * maxScroll);
  };

  const scrollToDot = (dotIndex) => {
    const positions = getScrollPositions();
    const targetScroll = positions[dotIndex] || 0;
    sliderMask.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
    updateActiveDot(dotIndex);
  };

  // Dot Click Handlers
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      scrollToDot(idx);
    });
  });

  // Track scroll position to update active dot
  sliderMask.addEventListener('scroll', () => {
    if (isDown) return;
    const maxScroll = sliderMask.scrollWidth - sliderMask.clientWidth;
    if (maxScroll <= 0) return;
    const currentScroll = sliderMask.scrollLeft;
    const dotProgress = (currentScroll / maxScroll) * (totalDots - 1);
    const activeIndex = Math.round(dotProgress);
    updateActiveDot(Math.max(0, Math.min(totalDots - 1, activeIndex)));
  }, { passive: true });

  // Mouse Drag to Scroll
  sliderMask.addEventListener('mousedown', (e) => {
    isDown = true;
    sliderMask.style.cursor = 'grabbing';
    startX = e.pageX - sliderMask.offsetLeft;
    scrollLeft = sliderMask.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      sliderMask.style.cursor = 'grab';
    }
  });

  sliderMask.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - sliderMask.offsetLeft;
    const walk = (x - startX) * 1.5;
    sliderMask.scrollLeft = scrollLeft - walk;
  });

  // Auto advance loop across the 6 pages every 4.5 seconds
  const startAutoPlay = () => {
    autoTimer = setInterval(() => {
      if (isDown) return;
      currentDotIndex++;
      if (currentDotIndex >= totalDots) {
        currentDotIndex = 0;
      }
      scrollToDot(currentDotIndex);
    }, 4500);
  };

  sliderMask.addEventListener('mouseenter', () => clearInterval(autoTimer));
  sliderMask.addEventListener('mouseleave', () => startAutoPlay());
  startAutoPlay();
});
