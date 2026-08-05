const AUTH_REDIRECT_URL = config.siteUrl || new URL('./', window.location.href).href;
let authOperationInProgress = false;

function authErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Correo o contraseña incorrectos. Si acabas de crear la cuenta, confirma primero el correo.';
  if (message.includes('email not confirmed')) return 'Tu correo todavía no está confirmado. Revisa la bandeja de entrada o reenvía el mensaje.';
  if (message.includes('email address not authorized')) return 'Supabase no tiene autorizado este destinatario. Configura un SMTP propio o utiliza Continuar con Google.';
  if (message.includes('rate limit')) return 'Se ha alcanzado el límite temporal de correos de Supabase. Espera un poco o utiliza Continuar con Google.';
  if (message.includes('user already registered')) return 'Ya existe una cuenta con este correo. Inicia sesión, reenvía la confirmación o utiliza Google.';
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) return 'Google no está habilitado en Supabase Authentication.';
  if (message.includes('redirect_uri_mismatch') || message.includes('redirect uri')) return 'Google rechazó la URL de retorno. Revisa la URI autorizada en Google Cloud y la URL permitida en Supabase.';
  if (message.includes('access_denied')) return 'Se canceló el acceso con Google.';
  return error?.message || String(error || 'No se ha podido completar la operación.');
}

function setAuthOperation(active, title = 'Procesando…', message = 'Espera un momento.') {
  authOperationInProgress = active;
  window.setAppBusy?.(active, title, message);
}

function showAuthError(error) {
  elements.authMessage.textContent = authErrorMessage(error);
  elements.authMessage.className = 'form-message is-error';
}

function ensureResendButton() {
  let button = document.querySelector('#auth-resend-button');
  if (button) return button;
  button = document.createElement('button');
  button.id = 'auth-resend-button';
  button.className = 'button button--secondary';
  button.type = 'button';
  button.textContent = 'Reenviar correo';
  button.hidden = true;
  elements.authForm?.querySelector('.dialog-actions')?.prepend(button);
  return button;
}

function setResendVisible(visible) {
  ensureResendButton().hidden = !visible;
}

async function signInWithGoogle() {
  if (!configured) return;

  const available = await window.checkGoogleAuthAvailability?.();
  if (available === false) {
    showDialog(elements.authDialog);
    showAuthError('Google no está habilitado en Supabase Authentication.');
    return;
  }

  window.rememberAuthReturn?.();
  elements.authMessage.textContent = 'Abriendo Google…';
  elements.authMessage.className = 'form-message';
  setAuthOperation(true, 'Abriendo Google…', 'Te llevamos a Google para elegir una cuenta.');

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      queryParams: { prompt: 'select_account' }
    }
  });

  if (error) {
    setAuthOperation(false);
    showAuthError(error);
    return;
  }

  if (data?.url && document.visibilityState === 'visible') {
    window.location.assign(data.url);
  }
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    showAuthError('Primero configura Supabase en config.js.');
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  setResendVisible(false);
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  setAuthOperation(true, 'Iniciando sesión…', 'Estamos cargando tu biblioteca personal.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthOperation(false);
    showAuthError(error);
    setResendVisible(String(error.message || '').toLowerCase().includes('email not confirmed'));
    return;
  }

  state.user = data.session?.user || data.user || null;
  updateConnectionState();
  updateAuthButton();
  closeDialog(elements.authDialog);
  await loadLibrary();
  setAuthOperation(false);
  showToast('Sesión iniciada.');
}

async function signUp() {
  if (!configured) {
    showAuthError('Primero configura Supabase en config.js.');
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  if (!email || password.length < 6) {
    showAuthError('Indica un correo válido y una contraseña de al menos 6 caracteres.');
    return;
  }

  setResendVisible(false);
  elements.authMessage.textContent = 'Creando cuenta…';
  elements.authMessage.className = 'form-message';
  setAuthOperation(true, 'Creando cuenta…', 'Estamos preparando tu biblioteca personal.');

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: AUTH_REDIRECT_URL }
  });

  setAuthOperation(false);
  if (error) {
    showAuthError(error);
    setResendVisible(String(error.message || '').toLowerCase().includes('already registered') || String(error.message || '').toLowerCase().includes('not confirmed'));
    return;
  }

  if (data.session) {
    state.user = data.session.user;
    updateConnectionState();
    updateAuthButton();
    closeDialog(elements.authDialog);
    await loadLibrary();
    showToast('Cuenta creada y sesión iniciada.');
    return;
  }

  elements.authMessage.textContent = 'Cuenta creada. Te hemos enviado un enlace de confirmación. También puedes entrar con Google.';
  elements.authMessage.className = 'form-message is-success';
  setResendVisible(true);
}

async function resendConfirmation() {
  if (!configured) return;
  const email = document.querySelector('#auth-email').value.trim();
  if (!email) {
    showAuthError('Escribe primero el correo de la cuenta.');
    return;
  }

  const button = ensureResendButton();
  button.disabled = true;
  elements.authMessage.textContent = 'Reenviando confirmación…';
  elements.authMessage.className = 'form-message';

  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: AUTH_REDIRECT_URL }
  });

  button.disabled = false;
  if (error) {
    showAuthError(error);
    return;
  }
  elements.authMessage.textContent = 'Correo reenviado. Revisa la bandeja de entrada, Spam y Promociones.';
  elements.authMessage.className = 'form-message is-success';
}

async function handleAuthButton() {
  if (state.user && supabaseClient) {
    setAuthOperation(true, 'Cerrando sesión…', 'Espera hasta que tu biblioteca quede protegida.');
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) {
      setAuthOperation(false);
      showToast(`No se pudo cerrar la sesión: ${error.message}`);
      return;
    }

    state.user = null;
    updateConnectionState();
    updateAuthButton();
    await loadLibrary();
    setAuthOperation(false);
    showToast('Sesión cerrada.');
    return;
  }

  elements.authMessage.textContent = '';
  elements.authMessage.className = 'form-message';
  setResendVisible(false);
  showDialog(elements.authDialog);
}

function bindEvents() {
  elements.menuToggle?.addEventListener('click', () => {
    const open = elements.nav.classList.toggle('is-open');
    elements.menuToggle.setAttribute('aria-expanded', String(open));
  });
  elements.nav?.querySelectorAll('a, button').forEach(control => {
    control.addEventListener('click', () => {
      elements.nav.classList.remove('is-open');
      elements.menuToggle?.setAttribute('aria-expanded', 'false');
    });
  });
  document.querySelectorAll('#open-book-form, #open-book-form-secondary, #footer-add-book').forEach(button => button.addEventListener('click', () => openBookForm()));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeDialog))));
  [elements.bookDialog, elements.authDialog].forEach(dialog => {
    dialog?.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
    dialog?.addEventListener('close', () => document.body.classList.remove('has-modal'));
  });
  elements.librarySearch?.addEventListener('input', () => { state.query = elements.librarySearch.value.trim(); renderLibrary(); });
  elements.filterButtons.forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.libraryFilter;
    elements.filterButtons.forEach(item => item.classList.toggle('is-active', item === button));
    renderLibrary();
  }));
  document.querySelector('#book-page-count')?.addEventListener('input', () => updateFormProgress('pages'));
  document.querySelector('#book-current-page')?.addEventListener('input', () => updateFormProgress('pages'));
  document.querySelector('#book-progress-percent')?.addEventListener('input', () => updateFormProgress('percent'));
  document.querySelector('#book-cover-file')?.addEventListener('change', previewSelectedBookCover);
  document.querySelector('#book-status')?.addEventListener('change', event => {
    const total = document.querySelector('#book-page-count');
    const current = document.querySelector('#book-current-page');
    const percent = document.querySelector('#book-progress-percent');
    if (event.target.value === 'finished' && total.value) {
      current.value = total.value;
      percent.value = 100;
    }
    updateFormProgress('pages');
  });
  elements.bookForm?.addEventListener('submit', saveBook);
  elements.googleForm?.addEventListener('submit', searchGoogleBooks);
  elements.authForm?.addEventListener('submit', signIn);
  elements.signupButton?.addEventListener('click', signUp);
  elements.authButton?.addEventListener('click', handleAuthButton);
  document.querySelector('#google-auth-button')?.addEventListener('click', signInWithGoogle);
  ensureResendButton().addEventListener('click', resendConfirmation);
}

async function initializeAuth() {
  if (!supabaseClient) {
    updateConnectionState();
    updateAuthButton();
    await loadLibrary();
    return;
  }

  const [{ data }, googleAvailable] = await Promise.all([
    supabaseClient.auth.getSession(),
    window.checkGoogleAuthAvailability?.()
  ]);
  state.user = data.session?.user || null;

  const oauthError = window.readOAuthError?.();
  if (oauthError) {
    showDialog(elements.authDialog);
    showAuthError(oauthError);
  }

  updateConnectionState();
  updateAuthButton();

  if (state.user && window.completeAuthReturn?.(state.user)) return;
  await loadLibrary();

  if (googleAvailable === false && !oauthError) {
    document.querySelector('#google-auth-button')?.setAttribute('aria-describedby', 'auth-message');
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    state.user = session?.user || null;
    updateConnectionState();
    updateAuthButton();

    if (event === 'SIGNED_IN') {
      closeDialog(elements.authDialog);
      if (window.completeAuthReturn?.(state.user)) return;
    }

    if (!authOperationInProgress) loadLibrary();
  });
}

async function startApplication() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.3.0'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();
  await initializeAuth();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApplication, { once: true });
else startApplication();
