// Cierre de sesión limpio con regreso inmediato a la portada.
(() => {
  function landingUrl() {
    try {
      return new URL('index.html', config.siteUrl || window.location.href).href;
    } catch (_) {
      return 'index.html';
    }
  }

  window.bookAffinitySignOut = async () => {
    if (!supabaseClient) {
      window.location.replace(landingUrl());
      return;
    }

    window.setAppBusy?.(true, 'Cerrando sesión…', 'Estamos protegiendo tu biblioteca.');

    try {
      const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
      if (error) throw error;

      state.user = null;
      window.bookAffinityProfile = null;
      window.location.replace(landingUrl());
    } catch (error) {
      window.setAppBusy?.(false);
      if (typeof showToast === 'function') {
        showToast(`No se pudo cerrar la sesión: ${error?.message || error}`);
      }
    }
  };
})();
