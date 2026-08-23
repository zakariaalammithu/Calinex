/**
 * Showreel Video Modal & Custom Play Cursor
 */
document.addEventListener('DOMContentLoaded', () => {
  const trigger  = document.getElementById('wsVideoTrigger');
  const modal    = document.getElementById('wsVideoModal');
  const closeBtn = document.getElementById('wsCloseBtn');
  const wrap     = document.getElementById('wsVideoWrap');
  const cursor   = document.getElementById('wsCursor');
  const video    = document.getElementById('wsVideo');

  if (!trigger || !modal || !video || !cursor || !wrap) return;

  // Custom Cursor
  let isOverTrigger = false;

  function showCursor() { 
    if (window.innerWidth > 767) {
      isOverTrigger = true;  
      cursor.classList.add('is-visible'); 
    }
  }
  function hideCursor() { 
    isOverTrigger = false; 
    cursor.classList.remove('is-visible'); 
  }

  trigger.addEventListener('mouseenter', showCursor);
  trigger.addEventListener('mouseleave', hideCursor);
  document.addEventListener('mouseleave', hideCursor);

  document.addEventListener('mousemove', (e) => {
    if (!isOverTrigger) return;
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  }, { passive: true });

  // Open Modal
  function openModal() {
    hideCursor();
    video.pause();
    video.loop = false;
    video.muted = false;
    video.controls = true;
    wrap.appendChild(video);

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  // Close Modal
  function closeModal() {
    video.pause();
    video.controls = false;
    video.muted = true;
    video.loop = true;
    trigger.appendChild(video);

    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    video.play().catch(() => {});
  }

  trigger.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
});
