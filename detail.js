// Punto de entrada de la ficha de libro.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.6',
    'detail-core.js?v=0.6.6',
    'save-popup.js?v=0.6.6',
    'avatar-options.js?v=0.6.6',
    'account.js?v=0.6.6',
    'social-profile-sync.js?v=0.6.6',
    'header-account-ui.js?v=0.6.6',
    'detail-form.js?v=0.6.6',
    'privacy-ui.js?v=0.6.6',
    'social-detail.js?v=0.6.6',
    'achievements.js?v=0.6.6',
    'achievement-notifications.js?v=0.6.6',
    'detail-auth-init.js?v=0.6.6',
    'session-visibility.js?v=0.6.6',
    'achievement-activity-watch.js?v=0.6.6',
    'signout-redirect.js?v=0.6.6'
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
