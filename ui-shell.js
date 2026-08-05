// Controles compartidos de tema y bloqueo de interfaz.
(() => {
  const THEME_KEY = 'book-affinity-theme';

  function preferredTheme() {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateThemeButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const dark = theme === 'dark';
      button.innerHTML = `<span aria-hidden="true">${dark ? '☀️' : '🌙'}</span> ${dark ? 'Modo día' : 'Modo noche'}`;
      button.setAttribute('aria-label', dark ? 'Activar modo día' : 'Activar modo noche');
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Cambiar al modo claro' : 'Cambiar al modo oscuro';
    });
  }

  function applyTheme(theme, persist = false) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = normalized;
    if (persist) window.localStorage.setItem(THEME_KEY, normalized);
    updateThemeButtons(normalized);
  }

  function ensureThemeControls() {
    document.querySelectorAll('.site-nav').forEach((nav, index) => {
      if (nav.querySelector('[data-theme-toggle]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-button nav-button--ghost theme-toggle';
      button.dataset.themeToggle = String(index);
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
      const authButton = nav.querySelector('#auth-button');
      nav.insertBefore(button, authButton || null);
    });
    updateThemeButtons(document.documentElement.dataset.theme || preferredTheme());
  }

  function ensureBusyOverlay() {
    let overlay = document.querySelector('#app-busy-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'app-busy-overlay';
    overlay.className = 'app-busy-overlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.setAttribute('aria-atomic', 'true');
    overlay.innerHTML = `
      <div class="app-busy-card">
        <span class="app-spinner" aria-hidden="true"></span>
        <strong id="app-busy-title">Procesando…</strong>
        <p id="app-busy-message">Espera un momento.</p>
      </div>`;
    document.body.append(overlay);
    return overlay;
  }

  function setPageInert(active, overlay) {
    [...document.body.children].forEach(child => {
      if (child === overlay) return;
      if (active) {
        if (!child.inert) child.dataset.bookAffinityBusyInert = 'true';
        child.inert = true;
      } else if (child.dataset.bookAffinityBusyInert === 'true') {
        child.inert = false;
        delete child.dataset.bookAffinityBusyInert;
      }
    });
  }

  window.setAppBusy = (active, title = 'Procesando…', message = 'Espera un momento.') => {
    const overlay = ensureBusyOverlay();
    overlay.querySelector('#app-busy-title').textContent = title;
    overlay.querySelector('#app-busy-message').textContent = message;
    overlay.hidden = !active;
    document.body.classList.toggle('is-busy', active);
    document.body.setAttribute('aria-busy', String(active));
    setPageInert(active, overlay);
  };

  function initializeShell() {
    applyTheme(preferredTheme());
    ensureThemeControls();
    ensureBusyOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShell, { once: true });
  } else {
    initializeShell();
  }
})();
