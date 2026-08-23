/**
 * CALINEX Seamless Public Form Connector & Plan Inquiry Modal Handler
 * Connects all forms and "Buy Now" pricing triggers to /api/public/submit-form
 */

(function() {
  // -------------------------------------------------------------
  // 1. Plan Inquiry Modal Generator & Controller
  // -------------------------------------------------------------
  let modalBackdrop = null;

  function ensurePlanModal() {
    if (modalBackdrop) return modalBackdrop;

    modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'calinex-plan-modal-backdrop';
    modalBackdrop.id = 'calinexPlanModal';
    modalBackdrop.innerHTML = `
      <div class="calinex-plan-modal-card" role="dialog" aria-modal="true" aria-labelledby="calinexModalTitle">
        <button type="button" class="calinex-modal-close-btn" aria-label="Close modal">✕</button>
        
        <div id="calinexModalBody">
          <div class="calinex-modal-badge" id="calinexPlanBadge">
            <span>✨</span> <span id="calinexPlanBadgeText">Starter Plan ($2,200/mo)</span>
          </div>
          
          <h3 class="calinex-modal-title" id="calinexModalTitle">Get Started with Your Plan</h3>
          <p class="calinex-modal-desc">Fill out your details below to initiate this plan. Our team will get in touch with you within 24 hours to begin onboarding.</p>
          
          <form class="calinex-modal-form" id="calinexPlanForm">
            <input type="hidden" name="plan" id="calinexHiddenPlan" value="Starter Plan">
            <input type="hidden" name="source" value="Pricing Card Buy Now">
            <input type="hidden" name="services" id="calinexHiddenService" value="UI/UX Design Subscription">
            
            <div class="calinex-modal-row-2col">
              <div class="calinex-modal-field">
                <label class="calinex-modal-label" for="planFullName">Your Full Name *</label>
                <input type="text" id="planFullName" name="Full-Name-4" class="calinex-modal-input" placeholder="e.g. Alex Morgan" required autocomplete="name" />
              </div>
              <div class="calinex-modal-field">
                <label class="calinex-modal-label" for="planEmail">Work Email *</label>
                <input type="email" id="planEmail" name="Email-4" class="calinex-modal-input" placeholder="alex@company.com" required autocomplete="email" />
              </div>
            </div>

            <div class="calinex-modal-row-2col">
              <div class="calinex-modal-field">
                <label class="calinex-modal-label" for="planPhone">WhatsApp / Phone</label>
                <input type="tel" id="planPhone" name="phone" class="calinex-modal-input" placeholder="+1 (555) 000-0000" autocomplete="tel" />
              </div>
              <div class="calinex-modal-field">
                <label class="calinex-modal-label" for="planCompany">Company / Website</label>
                <input type="text" id="planCompany" name="company" class="calinex-modal-input" placeholder="company.com" />
              </div>
            </div>

            <div class="calinex-modal-field">
              <label class="calinex-modal-label" for="planMessage">Project Requirements / Notes</label>
              <textarea id="planMessage" name="text-area-2" class="calinex-modal-textarea" placeholder="Tell us briefly about your product, timeline, or design goals..."></textarea>
            </div>

            <button type="submit" class="calinex-modal-submit-btn" id="calinexPlanSubmitBtn">
              <span>Submit Plan Request</span> &rarr;
            </button>
          </form>
        </div>

        <div id="calinexModalSuccess" class="calinex-modal-success-wrap" style="display: none;">
          <div class="calinex-modal-success-icon">✓</div>
          <h3 class="calinex-modal-success-title">Thank You! Inquiry Received 🎉</h3>
          <p class="calinex-modal-success-text" id="calinexSuccessMsg">We've received your request for this plan. Our senior lead will review your project brief and reply within 24 hours.</p>
          <button type="button" class="calinex-modal-submit-btn" id="calinexSuccessCloseBtn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    const closeBtn = modalBackdrop.querySelector('.calinex-modal-close-btn');
    const successCloseBtn = modalBackdrop.querySelector('#calinexSuccessCloseBtn');
    
    const closeModal = () => {
      modalBackdrop.classList.remove('is-active');
      setTimeout(() => {
        const bodyEl = document.getElementById('calinexModalBody');
        const succEl = document.getElementById('calinexModalSuccess');
        if (bodyEl) bodyEl.style.display = 'block';
        if (succEl) succEl.style.display = 'none';
        const form = document.getElementById('calinexPlanForm');
        if (form) form.reset();
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    successCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-active')) {
        closeModal();
      }
    });

    const planForm = document.getElementById('calinexPlanForm');
    planForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      e.stopPropagation();

      const submitBtn = document.getElementById('calinexPlanSubmitBtn');
      const origText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Submitting...</span>';
      submitBtn.disabled = true;

      const formData = new FormData(planForm);
      const payload = {};
      for (const [k, v] of formData.entries()) {
        payload[k] = v;
      }
      payload.page_url = window.location.pathname;

      try {
        const res = await fetch('/api/public/submit-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          document.getElementById('calinexModalBody').style.display = 'none';
          document.getElementById('calinexModalSuccess').style.display = 'block';
          const name = payload['Full-Name-4'] || 'there';
          const plan = payload.plan || 'selected';
          document.getElementById('calinexSuccessMsg').textContent = 
            `Thank you ${name}! We've received your request for the ${plan} plan. Our team will get back to you within 24 hours.`;
        } else {
          throw new Error(result.error || 'Submission failed');
        }
      } catch (err) {
        alert(err.message || 'Something went wrong. Please try again or email us directly at admin@calinex.us');
      } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
      }
    });

    return modalBackdrop;
  }

  function openPlanModal(planName, planPrice) {
    const modal = ensurePlanModal();
    const badgeText = document.getElementById('calinexPlanBadgeText');
    const hiddenPlan = document.getElementById('calinexHiddenPlan');
    const hiddenService = document.getElementById('calinexHiddenService');

    const formattedPlan = planPrice ? `${planName} (${planPrice})` : planName;
    badgeText.textContent = formattedPlan;
    hiddenPlan.value = formattedPlan;
    hiddenService.value = `Subscription Plan: ${formattedPlan}`;

    document.getElementById('calinexModalBody').style.display = 'block';
    document.getElementById('calinexModalSuccess').style.display = 'none';

    modal.classList.add('is-active');
    setTimeout(() => {
      const nameInput = document.getElementById('planFullName');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  // -------------------------------------------------------------
  // 2. Bind Pricing "Buy Now" & Custom Quote Buttons
  // -------------------------------------------------------------
  function initPricingButtons() {
    const pricingButtons = document.querySelectorAll('.pricing-button, a[href*="buy.stripe.com"], .pop_btn-wrap a');
    
    pricingButtons.forEach(btn => {
      if (btn.dataset.calinexPlanBound) return;
      btn.dataset.calinexPlanBound = 'true';

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest('.membership-single-wrap, .membership-border-wrapper, .project_single_wrapper') || btn.parentElement;
        let planTitle = 'Custom Project';
        let planPrice = '';

        if (card) {
          const titleEl = card.querySelector('.membership-title, .pricing-title, .h3, h2, h3');
          if (titleEl) planTitle = titleEl.textContent.trim();

          const priceEl = card.querySelector('.membership-price.usd, .membership-price, .pricing-price');
          if (priceEl) {
            planPrice = priceEl.textContent.replace(/\s+/g, ' ').trim();
          }
        }

        const btnText = btn.textContent.trim().toLowerCase();
        if (btnText.includes('custom')) {
          planTitle = 'Custom Project';
        }

        openPlanModal(planTitle, planPrice);
      });
    });
  }

  // -------------------------------------------------------------
  // 3. Connect All Existing Webflow & In-Page Forms
  // -------------------------------------------------------------
  function initForms() {
    const forms = document.querySelectorAll('form.form2, form[data-name="Wavespace Contact Form"], .w-form form');
    if (!forms || forms.length === 0) return;

    forms.forEach(form => {
      if (form.dataset.calinexBound || form.id === 'calinexPlanForm') return;
      form.dataset.calinexBound = 'true';

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"], .c_submit_btn');
        const originalVal = submitBtn ? (submitBtn.value || submitBtn.textContent) : 'Send message';
        const waitText = submitBtn ? (submitBtn.getAttribute('data-wait') || 'Please wait...') : 'Please wait...';

        if (submitBtn) {
          if (submitBtn.tagName === 'INPUT') submitBtn.value = waitText;
          else submitBtn.textContent = waitText;
          submitBtn.disabled = true;
        }

        const formData = new FormData(form);
        const payload = {};

        for (const [key, value] of formData.entries()) {
          payload[key] = value;
        }

        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
          if (cb.name) payload[cb.name] = cb.checked;
        });

        payload.page_url = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
          if (urlParams.has(param)) payload[param] = urlParams.get(param);
        });

        const formWrap = form.closest('.w-form') || form.parentElement;
        const doneWrap = formWrap ? formWrap.querySelector('.w-form-done') : null;
        const failWrap = formWrap ? formWrap.querySelector('.w-form-fail') : null;

        try {
          const res = await fetch('/api/public/submit-form', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const result = await res.json();

          if (res.ok && result.success) {
            form.style.display = 'none';
            if (doneWrap) {
              doneWrap.style.display = 'block';
            } else {
              const successDiv = document.createElement('div');
              successDiv.className = 'w-form-done';
              successDiv.style.display = 'block';
              successDiv.style.padding = '24px';
              successDiv.style.borderRadius = '12px';
              successDiv.style.background = 'rgba(34, 197, 94, 0.1)';
              successDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
              successDiv.style.color = '#22c55e';
              successDiv.style.textAlign = 'center';
              successDiv.style.fontWeight = '600';
              successDiv.innerHTML = `<div>🎉 Thank you! Your project inquiry has been received. We will get back to you within 24 hours.</div>`;
              form.parentNode.insertBefore(successDiv, form.nextSibling);
            }
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (err) {
          console.error('[Form Submit Error]:', err);
          if (failWrap) {
            failWrap.style.display = 'block';
            const failText = failWrap.querySelector('div');
            if (failText && err.message) failText.textContent = err.message;
          } else {
            alert(err.message || 'Oops! Something went wrong while submitting the form. Please try again.');
          }

          if (submitBtn) {
            if (submitBtn.tagName === 'INPUT') submitBtn.value = originalVal;
            else submitBtn.textContent = originalVal;
            submitBtn.disabled = false;
          }
        }
      });
    });
  }

  function initAll() {
    initForms();
    initPricingButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

