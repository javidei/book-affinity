// Punto de entrada de la ficha de libro.
(async () => {
  const modules = [
    'ui-shell.js?v=0.5.1',
    'detail-core.js?v=0.5.1',
    'save-popup.js?v=0.5.1',
    'avatar-options.js?v=0.5.1',
    'account.js?v=0.5.1',
    'social-profile-sync.js?v=0.5.1',
    'header-account-ui.js?v=0.5.1',
    'detail-form.js?v=0.5.1',
    'privacy-ui.js?v=0.5.1',
    'social-detail.js?v=0.5.1',
    'detail-auth-init.js?v=0.5.1',
    'session-visibility.js?v=0.5.1',
    'signout-redirect.js?v=0.5.1'
  ];
  for (const source of modules) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${source}`));
      document.head.append(script);
    });
  }
})().catch(error => {
  console.error('No se pudo cargar la ficha.', error);
  const loading = document.querySelector('#detail-loading');
  if (loading) loading.textContent = 'No se pudo iniciar la ficha del libro.';
});
