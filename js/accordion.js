/**
 * Modular Accordion Script for:
 * 1. Global FAQs (.singel_tab_wrap / .faq_item)
 * 2. About Page Co-Founders Accordion (.lb_faq_card)
 * 3. About Page "The beliefs behind the builds" Accordion (.sticky-sm-card)
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Standard FAQ Accordion
  const faqItems = document.querySelectorAll('.singel_tab_wrap, .faq_accordion_item');
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq_question_wrap, .faq_header');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-open');
        }
      });
      if (isOpen) {
        item.classList.remove('is-open');
      } else {
        item.classList.add('is-open');
      }
    });
  });

  // 2. About Page "Why Wavespace / Co-founders" Accordion (.lb_faq_card)
  const lbCards = document.querySelectorAll('.lb_faq_card');
  lbCards.forEach((card) => {
    card.addEventListener('click', () => {
      const isOpen = card.classList.contains('is-open');
      if (isOpen) {
        card.classList.remove('is-open');
      } else {
        card.classList.add('is-open');
      }
    });
  });

  // 3. About Page "The beliefs behind the builds" Accordion (.sticky-sm-card)
  const beliefCards = document.querySelectorAll('.sticky-sm-card');
  beliefCards.forEach((card) => {
    card.addEventListener('click', () => {
      const isOpen = card.classList.contains('is-open');
      if (isOpen) {
        card.classList.remove('is-open');
      } else {
        card.classList.add('is-open');
      }
    });
  });
});
