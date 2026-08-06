// Carga ordenada de los módulos clásicos de Book Affinity.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.8',
    'app-core.js?v=0.6.8',
    'save-popup.js?v=0.6.8',
    'avatar-options.js?v=0.6.8',
    'account.js?v=0.6.8',
    'social-profile-sync.js?v=0.6.8',
    'header-account-ui.js?v=0.6.8',
    'app-forms.js?v=0.6.8',
    'app-library.js?v=0.6.8',
    'privacy-ui.js?v=0.6.8',
    'library-view-options.js?v=0.6.8',
    'app-search.js?v=0.6.8',
    'social.js?v=0.6.8',
    'session-visibility.js?v=0.6.8',
    'achievements.js?v=0.6.8',
    'social-controls.js?v=0.6.8',
    'achievement-notifications.js?v=0.6.8',
    'app-auth-init.js?v=0.6.8',
    'signout-redirect.js?v=0.6.8'
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
