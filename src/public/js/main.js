document.querySelectorAll('.review-form').forEach((form) => {
  const reason = form.querySelector('[name="rejectionReason"]');
  form.querySelectorAll('[name="status"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (reason) reason.required = button.value === 'REJECTED';
    });
  });
});