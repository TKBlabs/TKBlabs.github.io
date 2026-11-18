// Assemble the contact address at runtime so it is absent from static HTML.
(() => {
  const address = String.fromCharCode(
    116, 101, 116, 115, 117, 121, 97, 64,
    116, 107, 98, 116, 107, 46, 99, 111, 109
  );

  document.querySelectorAll('[data-email-link]').forEach((link) => {
    link.href = `mailto:${address}`;
    link.setAttribute('aria-label', `メールを送る: ${address}`);
  });

  document.querySelectorAll('[data-email-text]').forEach((text) => {
    text.textContent = address;
  });
})();
