// Carga ordenada de los módulos clásicos de Book Affinity.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.6',
    'app-core.js?v=0.6.6',
    'save-popup.js?v=0.6.6',
    'avatar-options.js?v=0.6.6',
    'account.js?v=0.6.6',
    'social-profile-sync.js?v=0.6.6',
    'header-account-ui.js?v=0.6.6',
    'app-forms.js?v=0.6.6',
    'app-library.js?v=0.6.6',
    'privacy-ui.js?v=0.6.6',
    'app-search.js?v=0.6.6',
    'social.js?v=0.6.6',
    'session-visibility.js?v=0.6.6',
    'achievements.js?v=0.6.6',
    'social-controls.js?v=0.6.6',
    'achievement-notifications.js?v=0.6.6',
    'app-auth-init.js?v=0.6.6',
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
  console.error('Book Affinity no pudo iniciar.', error);
  const state = document.querySelector('#connection-state');
  if (state) state.textContent = 'No se pudo iniciar la aplicación. Recarga la página.';
});
