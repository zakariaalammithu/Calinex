/**
 * Main application scripts for Wavespace
 */
document.addEventListener('DOMContentLoaded', () => {
  // Sticky Navbar Blur and Shadow on scroll
  const navbar = document.querySelector('.navbar_white');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile Menu Toggle
  const menuBtn = document.querySelector('.menu-button-2');
  const navMenu = document.querySelector('.nav-menu');
  if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('is-active');
      navMenu.classList.toggle('is-open');
      document.body.style.overflow = navMenu.classList.contains('is-open') ? 'hidden' : '';
    });

    // Close when clicking nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('is-active');
        navMenu.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  // Mobile Services Dropdown Accordion
  const serviceDropdown = document.querySelector('.nav-dropdown');
  if (serviceDropdown && window.innerWidth <= 991) {
    const toggle = serviceDropdown.querySelector('.dropdown-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        serviceDropdown.classList.toggle('is-open');
      });
    }
  }

  // External link handlers
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (!link.href.includes(window.location.hostname)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Showreel Video Click-to-Play/Pause
  const wsVideo = document.getElementById('wsVideo');
  if (wsVideo) {
    wsVideo.addEventListener('click', () => {
      if (wsVideo.paused) {
        wsVideo.play();
      } else {
        wsVideo.pause();
      }
    });
  }
});
