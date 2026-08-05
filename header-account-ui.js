// Presentación compacta de la cuenta conectada en la cabecera.
(() => {
  const AVATARS = Array.isArray(window.BOOK_AFFINITY_AVATARS) ? window.BOOK_AFFINITY_AVATARS : [];

  function connectedIdentity() {
    const username = String(window.bookAffinityProfile?.username || '').trim();
    const email = String(state?.user?.email || '').trim();
    const avatarId = String(state?.user?.user_metadata?.book_affinity_avatar || '');
    const avatar = AVATARS.find(option => option.id === avatarId) || null;
    const rawName = username || email.split('@')[0] || 'usuario';
    return {
      label: username ? `@${username}` : (email || 'Mi cuenta'),
      title: username ? `Cuenta conectada: @${username}` : (email ? `Cuenta conectada: ${email}` : 'Mi cuenta'),
      initial: rawName.charAt(0).toUpperCase() || 'U',
      avatar
    };
  }

  function removeLegacyBadge() {
    document.querySelectorAll('#session-user-badge').forEach(node => node.remove());
  }

  function renderConnectedAccount(button, identity) {
    const icons = document.createElement('span');
    icons.className = 'account-header-button__icons';

    const logo = document.createElement('img');
    logo.className = 'account-header-button__logo';
    logo.src = 'assets/logo.svg';
    logo.alt = '';
    logo.width = 34;
    logo.height = 34;
    icons.append(logo);

    if (identity.avatar) {
      const avatar = document.createElement('img');
      avatar.className = 'account-header-button__avatar';
      avatar.src = identity.avatar.src;
      avatar.alt = '';
      avatar.width = 34;
      avatar.height = 34;
      icons.append(avatar);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'account-header-button__avatar account-header-button__avatar--fallback';
      fallback.textContent = identity.initial;
      icons.append(fallback);
    }

    const copy = document.createElement('span');
    copy.className = 'account-header-button__copy';
    const caption = document.createElement('small');
    caption.textContent = 'Mi cuenta';
    const username = document.createElement('strong');
    username.textContent = identity.label;
    copy.append(caption, username);
    button.replaceChildren(icons, copy);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeHeaderAccountUi, { once: true });
  else initializeHeaderAccountUi();
})();
