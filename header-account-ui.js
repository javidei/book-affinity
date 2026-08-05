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

  function renderConnectedAccount(button, identity) {
    const logo = document.createElement('img');
    logo.className = 'account-header-button__logo';
    logo.src = 'assets/logo.svg';
    logo.alt = '';
    logo.width = 34;
    logo.height = 34;

    const copy = document.createElement('span');
    copy.className = 'account-header-button__copy';

    const caption = document.createElement('small');
    caption.textContent = 'Mi cuenta';

    const username = document.createElement('strong');
    username.textContent = identity.label;

    copy.append(caption, username);
    button.replaceChildren(logo, copy);
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
    renderConnectedAccount(button, identity);
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
