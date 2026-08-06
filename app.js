// Carga ordenada de los módulos clásicos de Book Affinity.
(async () => {
  const modules = [
    'ui-shell.js?v=0.6.4',
    'app-core.js?v=0.6.4',
    'save-popup.js?v=0.6.4',
    'avatar-options.js?v=0.6.4',
    'account.js?v=0.6.4',
    'social-profile-sync.js?v=0.6.4',
    'header-account-ui.js?v=0.6.4',
    'app-forms.js?v=0.6.4',
    'app-library.js?v=0.6.4',
    'privacy-ui.js?v=0.6.4',
    'app-search.js?v=0.6.4',
    'social.js?v=0.6.4',
    'session-visibility.js?v=0.6.4',
    'achievements.js?v=0.6.4',
    'social-controls.js?v=0.6.4',
    'app-auth-init.js?v=0.6.4',
    'signout-redirect.js?v=0.6.4'
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
