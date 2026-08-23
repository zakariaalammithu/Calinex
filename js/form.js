/**
 * Contact & Project Inquiry Form Interactions
 */
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('.form2');

  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('.c_submit_btn');
      const originalText = submitBtn.value || submitBtn.textContent;

      submitBtn.value = 'Sending...';
      submitBtn.disabled = true;

      // Simulate instantaneous submission & success
      setTimeout(() => {
        submitBtn.value = 'Message Sent! 🎉';
        submitBtn.style.backgroundColor = '#34c759';

        const successNotice = document.createElement('div');
        successNotice.style.padding = '16px';
        successNotice.style.marginTop = '16px';
        successNotice.style.background = 'rgba(52, 199, 89, 0.15)';
        successNotice.style.border = '1px solid rgba(52, 199, 89, 0.4)';
        successNotice.style.borderRadius = '12px';
        successNotice.style.color = '#34c759';
        successNotice.style.fontWeight = '600';
        successNotice.style.textAlign = 'center';
        successNotice.textContent = 'Thank you! Your project inquiry has been received. Our team will get back to you within 24 hours.';

        form.appendChild(successNotice);

        setTimeout(() => {
          form.reset();
          submitBtn.value = originalText;
          submitBtn.disabled = false;
          submitBtn.style.backgroundColor = '';
          successNotice.remove();
        }, 5000);
      }, 800);
    });
  });
});
