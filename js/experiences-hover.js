/**
 * Interactive Mouse-Follow Hover Image Preview for "These services are included"
 */
document.addEventListener('DOMContentLoaded', () => {
  const serviceCards = document.querySelectorAll('.experiences-single-wrap');
  if (!serviceCards.length) return;

  // Create floating preview container if not exists
  let previewEl = document.getElementById('expHoverPreview');
  if (!previewEl) {
    previewEl = document.createElement('div');
    previewEl.id = 'expHoverPreview';
    previewEl.className = 'exp-hover-preview-floating';
    previewEl.innerHTML = '<img src="" alt="Service Preview" class="exp-hover-preview-img"/>';
    document.body.appendChild(previewEl);
  }

  const previewImg = previewEl.querySelector('img');
  let currentTarget = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let isHovering = false;
  let rafId = null;

  // Smooth lerp loop
  function updatePosition() {
    if (!isHovering && Math.abs(currentX - targetX) < 0.1 && Math.abs(currentY - targetY) < 0.1) {
      previewEl.style.opacity = '0';
      previewEl.style.transform = 'translate(-50%, -50%) scale(0.85)';
      rafId = null;
      return;
    }

    currentX += (targetX - currentX) * 0.15;
    currentY += (targetY - currentY) * 0.15;

    previewEl.style.left = `${currentX}px`;
    previewEl.style.top = `${currentY}px`;

    rafId = requestAnimationFrame(updatePosition);
  }

  function startRaf() {
    if (!rafId) {
      rafId = requestAnimationFrame(updatePosition);
    }
  }

  serviceCards.forEach((card) => {
    // Find preview image inside or in data attribute
    const innerImg = card.querySelector('img:not(.blue-arrow):not(.btn-arrow-icon)');
    const imgSrc = card.getAttribute('data-preview-img') || (innerImg ? innerImg.getAttribute('src') : '');

    if (imgSrc) {
      card.setAttribute('data-preview-img', imgSrc);
    }

    card.addEventListener('mouseenter', (e) => {
      const src = card.getAttribute('data-preview-img');
      if (!src) return;

      currentTarget = card;
      isHovering = true;

      // Update image
      previewImg.src = src;

      // Position immediately
      targetX = e.clientX + 20;
      targetY = e.clientY - 40;
      currentX = targetX;
      currentY = targetY;

      previewEl.style.left = `${currentX}px`;
      previewEl.style.top = `${currentY}px`;
      previewEl.style.opacity = '1';
      previewEl.style.transform = 'translate(-50%, -50%) scale(1)';

      startRaf();
    });

    card.addEventListener('mousemove', (e) => {
      if (currentTarget !== card) return;

      // Offset slightly to the right of cursor
      let posX = e.clientX + 160;
      let posY = e.clientY - 20;

      // Edge boundaries
      const pWidth = 340;
      const pHeight = 230;

      if (posX + pWidth / 2 > window.innerWidth - 20) {
        posX = e.clientX - 160;
      }
      if (posY + pHeight / 2 > window.innerHeight - 20) {
        posY = window.innerHeight - pHeight / 2 - 20;
      }
      if (posY - pHeight / 2 < 20) {
        posY = pHeight / 2 + 20;
      }

      targetX = posX;
      targetY = posY;
      startRaf();
    });

    card.addEventListener('mouseleave', () => {
      if (currentTarget === card) {
        currentTarget = null;
        isHovering = false;
        previewEl.style.opacity = '0';
        previewEl.style.transform = 'translate(-50%, -50%) scale(0.9)';
      }
    });
  });
});
