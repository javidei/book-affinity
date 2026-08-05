// Presentación compacta de la cuenta conectada en la cabecera.
(() => {
  function connectedIdentity() {
    const username = String(window.bookAffinityProfile?.username || '').trim();
    const email = String(state?.user?.email || '').trim();
    return {
      label: username ? `@${username}` : (email || 'Mi cuenta'),
      title: username ? `Cuenta conectada: @${username}` : (email ? `Cuenta conectada: ${email}` : 'Mi cuenta')
    };
  }

  function removeLegacyBadge() {
    document.querySelectorAll('#session-user-badge').forEach(node => node.remove());
  }

  window.refreshConnectedUserUi = () => {
    removeLegacyBadge();

    const button = document.querySelector('#auth-button');
    if (!button) return;

    if (!state?.user) {
      button.className = 'nav-button nav-button--ghost';
      button.textContent = 'Entrar';
      button.title = 'Iniciar sesión';
      button.setAttribute('aria-label', 'Iniciar sesión');
      return;
    }

    const identity = connectedIdentity();
    button.className = 'account-header-button';
    button.innerHTML = `
      <img class="account-header-button__logo" src="assets/logo.svg" alt="" width="34" height="34">
      <span class="account-header-button__copy">
        <small>Mi cuenta</small>
        <strong>${identity.label}</strong>
      </span>`;
    button.title = `${identity.title}. Abrir Mi cuenta.`;
    button.setAttribute('aria-label', button.title);
  };

  function initializeHeaderAccountUi() {
    removeLegacyBadge();
    window.refreshConnectedUserUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHeaderAccountUi, { once: true });
  } else {
    initializeHeaderAccountUi();
  }
})();
