document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.promo-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const card = btn.closest('.promo-card');
      const content = card.querySelector('.promo-content');
      const open = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        content.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        content.style.display = 'none';
      }
    });
  });
});
