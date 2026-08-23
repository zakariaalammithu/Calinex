/**
 * Book a Call & Pricing Modal Popup & API Dispatcher
 * Exact 100% Replication of Wavespace.agency
 */
(function() {
  function injectModalHTML() {
    if (document.getElementById('wsBookCallModal')) return;

    const modalHTML = `
      <div class="ws-book-modal-backdrop" id="wsBookCallModal" role="dialog" aria-modal="true">
        <div class="ws-book-modal-card">
          <button class="ws-modal-close-btn" id="wsModalCloseBtn" aria-label="Close modal">✕</button>
          
          <div class="ws-modal-header">
            <div class="ws-modal-avatars">
              <img src="../images/md-sharafat-ullah.jpg" alt="Md. Sharafat Ullah" class="ws-modal-avatar"/>
              <img src="../images/md-sharafat-ullah.jpg" alt="Team Lead" class="ws-modal-avatar"/>
            </div>
            <div class="ws-modal-title-wrap">
              <h3 class="ws-modal-title">Book a call with our experts</h3>
              <p class="ws-modal-subtitle">to discuss your goals and build a project plan</p>
            </div>
          </div>

          <div id="wsModalToast" class="ws-modal-toast"></div>

          <form class="ws-modal-form" id="wsBookCallForm">
            <div class="ws-modal-grid-2">
              <div class="ws-modal-field">
                <input type="email" name="email" class="ws-modal-input" placeholder="Email" required />
              </div>
              <div class="ws-modal-field">
                <input type="text" name="name" class="ws-modal-input" placeholder="Full name" required />
              </div>
            </div>

            <div class="ws-modal-grid-2">
              <div class="ws-modal-field">
                <select name="budget" class="ws-modal-select" required>
                  <option value="">Project budget</option>
                  <option value="$2,000 - $5,000">$2,000 - $5,000</option>
                  <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                  <option value="$10,000 - $20,000">$10,000 - $20,000</option>
                  <option value="$20,000 - $50,000">$20,000 - $50,000</option>
                  <option value="$50,000+">$50,000+</option>
                </select>
              </div>
              <div class="ws-modal-field">
                <select name="source" class="ws-modal-select" required>
                  <option value="">How did you hear about us?</option>
                  <option value="Clutch.co">Clutch.co</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Dribbble / Behance">Dribbble / Behance</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Referral / Recommendation">Referral / Recommendation</option>
                  <option value="Social Media">Social Media</option>
                </select>
              </div>
            </div>

            <div class="ws-modal-field">
              <textarea name="goals" class="ws-modal-textarea" placeholder="Tell us about your product and goals." required></textarea>
            </div>

            <div class="ws-modal-chips-wrap">
              <div class="ws-modal-chips-label">How can we help you?</div>
              <div class="ws-modal-chips-grid">
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="UI/UX Design" checked />
                  <span>UI/UX Design</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="SaaS Design" />
                  <span>SaaS Design</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="Branding" />
                  <span>Branding</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="CRO" />
                  <span>CRO</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="Mobile app" />
                  <span>Mobile app</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="Development" />
                  <span>Development</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="MVP Development" />
                  <span>MVP Development</span>
                </label>
                <label class="ws-modal-chip">
                  <input type="checkbox" name="services" value="Web Design" />
                  <span>Web Design</span>
                </label>
              </div>
            </div>

            <div class="ws-modal-bottom-bar">
              <button type="submit" class="ws-modal-submit-btn" id="wsModalSubmitBtn">Send message</button>
              <div class="ws-modal-prefer-email">
                <span>Prefer email?</span>
                <a href="mailto:hello@calinex.us">hello@calinex.us</a>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupFormEvents();
  }

  function openModal() {
    injectModalHTML();
    const modal = document.getElementById('wsBookCallModal');
    if (modal) {
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const modal = document.getElementById('wsBookCallModal');
    if (modal) {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  function setupFormEvents() {
    const closeBtn = document.getElementById('wsModalCloseBtn');
    const modal = document.getElementById('wsBookCallModal');
    const form = document.getElementById('wsBookCallForm');
    const toast = document.getElementById('wsModalToast');
    const submitBtn = document.getElementById('wsModalSubmitBtn');

    if (closeBtn) closeBtn.onclick = closeModal;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!submitBtn) return;

        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        if (toast) {
          toast.className = 'ws-modal-toast';
          toast.style.display = 'none';
        }

        const formData = new FormData(form);
        const email = formData.get('email');
        const name = formData.get('name');
        const budget = formData.get('budget');
        const source = formData.get('source');
        const goals = formData.get('goals');
        const services = formData.getAll('services');

        try {
          const response = await fetch('/api/public/submit-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, budget, source, goals, services })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            if (toast) {
              toast.className = 'ws-modal-toast success';
              toast.textContent = '✓ Thank you! Your request has been received. Our team will contact you within 24 hours (Notification dispatched to calinexusa@gmail.com).';
              toast.style.display = 'block';
            }
            form.reset();
            setTimeout(() => {
              closeModal();
              if (toast) toast.style.display = 'none';
            }, 3500);
          } else {
            if (toast) {
              toast.className = 'ws-modal-toast error';
              toast.textContent = data.error || data.message || 'Something went wrong. Please try again.';
              toast.style.display = 'block';
            }
          }
        } catch (err) {
          console.error('Submission error:', err);
          if (toast) {
            toast.className = 'ws-modal-toast error';
            toast.textContent = 'Unable to connect to server. Please try again later.';
            toast.style.display = 'block';
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      };
    }
  }

  // Global Keydown Handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Global Capture Phase Interceptor for "Book a call" AND "Buy Now" / "Get custom quote" buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, div.button, .primary-button, .secondary_button, .pricing-button, .p_card_btn2, .nav_btn, [data-open-modal]');
    if (!target) return;

    const txt = (target.textContent || '').trim().toLowerCase();
    const href = (target.getAttribute('href') || '').toLowerCase();

    const isTrigger =
      txt.includes('book a call') ||
      txt.includes('book a 30-min call') ||
      txt.includes('book an intro call') ||
      txt.includes('book a intro call') ||
      txt.includes('consult an expert') ||
      txt.includes('buy now') ||
      txt.includes('get custom quote') ||
      target.classList.contains('pricing-button') ||
      target.classList.contains('p_card_btn2') ||
      href.includes('cal.com/calinex') ||
      target.getAttribute('data-open-modal') === 'book-call' ||
      target.classList.contains('js-open-book-modal');

    if (isTrigger && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    }
  }, true);

  // Expose global open method
  window.openBookCallModal = openModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModalHTML);
  } else {
    injectModalHTML();
  }
})();
