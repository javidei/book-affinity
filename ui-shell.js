// Controles compartidos de tema, bloqueo de interfaz y ayuda para OAuth.
(() => {
  const THEME_KEY = 'book-affinity-theme';
  const AUTH_RETURN_KEY = 'book-affinity-auth-return';
  let googleAvailabilityPromise = null;

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

  window.rememberAuthReturn = () => {
    try {
      window.sessionStorage.setItem(AUTH_RETURN_KEY, window.location.href);
    } catch (error) {
      console.warn('No se pudo recordar la página de retorno.', error);
    }
  };

  window.completeAuthReturn = user => {
    if (!user) return false;
    let target = '';
    try {
      target = window.sessionStorage.getItem(AUTH_RETURN_KEY) || '';
      window.sessionStorage.removeItem(AUTH_RETURN_KEY);
    } catch (error) {
      return false;
    }
    if (!target) return false;
    try {
      const targetUrl = new URL(target, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return false;
      const targetKey = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      const currentKey = `${window.location.pathname}${window.location.search}`;
      if (targetKey && targetKey !== currentKey) {
        window.location.replace(targetUrl.href);
        return true;
      }
    } catch (error) {
      console.warn('La página de retorno de Google no era válida.', error);
    }
    return false;
  };

  window.readOAuthError = () => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const error = search.get('error_description') || hash.get('error_description') || search.get('error') || hash.get('error');
    if (!error) return '';
    const cleanUrl = `${window.location.pathname}${window.location.search
      .replace(/([?&])(error|error_code|error_description)=[^&]*/g, '$1')
      .replace(/[?&]$/, '')}`;
    window.history.replaceState({}, document.title, cleanUrl || window.location.pathname);
    return decodeURIComponent(String(error).replace(/\+/g, ' '));
  };

  window.checkGoogleAuthAvailability = async () => {
    if (googleAvailabilityPromise) return googleAvailabilityPromise;
    const config = window.BOOK_AFFINITY_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey) return null;

    googleAvailabilityPromise = (async () => {
      try {
        const response = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: config.supabasePublishableKey }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const settings = await response.json();
        const enabled = Boolean(settings?.external?.google);
        document.querySelectorAll('#google-auth-button').forEach(button => {
          button.disabled = !enabled;
          button.classList.toggle('is-unavailable', !enabled);
          button.title = enabled
            ? 'Iniciar sesión usando una cuenta de Google'
            : 'Google todavía no está habilitado en Supabase Authentication';
          if (!enabled) button.innerHTML = '<span aria-hidden="true">G</span> Google pendiente de configurar';
        });
        return enabled;
      } catch (error) {
        console.warn('No se pudo comprobar el proveedor de Google.', error);
        return null;
      }
    })();

    return googleAvailabilityPromise;
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
