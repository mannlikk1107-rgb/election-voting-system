document.querySelectorAll('.review-form').forEach((form) => {
  const reason = form.querySelector('[name="rejectionReason"]');
  form.querySelectorAll('[name="status"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (reason) reason.required = button.value === 'REJECTED';
    });
  });
});

const authenticatedShell = document.querySelector('.authenticated-shell');
if (authenticatedShell) {
  const menuToggle = authenticatedShell.querySelector('[data-sidebar-toggle]');
  const closeButton = authenticatedShell.querySelector('[data-sidebar-close]');
  const closeMenu = () => {
    document.body.classList.remove('authenticated-sidebar-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  };

  menuToggle?.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('authenticated-sidebar-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  closeButton?.addEventListener('click', closeMenu);
  authenticatedShell.querySelectorAll('.authenticated-nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}