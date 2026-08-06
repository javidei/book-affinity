// Punto de entrada de la ficha de libro.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.7',
    'detail-core.js?v=0.6.7',
    'save-popup.js?v=0.6.7',
    'avatar-options.js?v=0.6.7',
    'account.js?v=0.6.7',
    'social-profile-sync.js?v=0.6.7',
    'header-account-ui.js?v=0.6.7',
    'detail-form.js?v=0.6.7',
    'privacy-ui.js?v=0.6.7',
    'social-detail.js?v=0.6.7',
    'achievements.js?v=0.6.7',
    'achievement-notifications.js?v=0.6.7',
    'detail-auth-init.js?v=0.6.7',
    'session-visibility.js?v=0.6.7',
    'achievement-activity-watch.js?v=0.6.7',
    'signout-redirect.js?v=0.6.7'
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
