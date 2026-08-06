// Carga ordenada de los módulos clásicos de Book Affinity.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.5',
    'app-core.js?v=0.6.5',
    'save-popup.js?v=0.6.5',
    'avatar-options.js?v=0.6.5',
    'account.js?v=0.6.5',
    'social-profile-sync.js?v=0.6.5',
    'header-account-ui.js?v=0.6.5',
    'app-forms.js?v=0.6.5',
    'app-library.js?v=0.6.5',
    'privacy-ui.js?v=0.6.5',
    'app-search.js?v=0.6.5',
    'social.js?v=0.6.5',
    'session-visibility.js?v=0.6.5',
    'achievements.js?v=0.6.5',
    'social-controls.js?v=0.6.5',
    'achievement-notifications.js?v=0.6.5',
    'app-auth-init.js?v=0.6.5',
    'signout-redirect.js?v=0.6.5'
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
