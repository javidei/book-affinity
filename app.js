// Carga ordenada de los módulos clásicos de Book Affinity.
(async () => {
  const modules = [
    'app-core.js?v=0.2.2',
    'save-popup.js?v=0.2.2',
    'app-library.js?v=0.2.2',
    'app-forms.js?v=0.2.2',
    'app-search.js?v=0.2.2',
    'app-auth-init.js?v=0.2.2'
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
