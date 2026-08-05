// Punto de entrada de la ficha de libro.
(async () => {
  const modules = [
    'detail-core.js?v=0.2.2',
    'save-popup.js?v=0.2.2',
    'detail-form.js?v=0.2.2',
    'detail-auth-init.js?v=0.2.2'
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
