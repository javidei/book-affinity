const AUTH_REDIRECT_URL = config.siteUrl || new URL('./', window.location.href).href;
let authOperationInProgress = false;

function detailAuthErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('email not confirmed')) return 'Tu correo todavía no está confirmado.';
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) return 'Google no está habilitado en Supabase Authentication.';
  if (message.includes('redirect_uri_mismatch') || message.includes('redirect uri')) return 'Google rechazó la URL de retorno. Revisa la URI autorizada en Google Cloud y la URL permitida en Supabase.';
  if (message.includes('access_denied')) return 'Se canceló el acceso con Google.';
  return error?.message || String(error || 'No se ha podido iniciar sesión.');
}

function setDetailAuthOperation(active, title = 'Procesando…', message = 'Espera un momento.') {
  authOperationInProgress = active;
  window.setAppBusy?.(active, title, message);
}

function showDetailAuthError(error) {
  elements.authMessage.textContent = detailAuthErrorMessage(error);
  elements.authMessage.className = 'form-message is-error';
}

async function signInWithGoogle() {
  if (!configured) return;

  const available = await window.checkGoogleAuthAvailability?.();
  if (available === false) {
    showDialog(elements.authDialog);
    showDetailAuthError('Google no está habilitado en Supabase Authentication.');
    return;
  }

  window.rememberAuthReturn?.();
  elements.authMessage.textContent = 'Abriendo Google…';
  elements.authMessage.className = 'form-message';
  setDetailAuthOperation(true, 'Abriendo Google…', 'Te llevamos a Google para elegir una cuenta.');

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      queryParams: { prompt: 'select_account' }
    }
  });

  if (error) {
    setDetailAuthOperation(false);
    showDetailAuthError(error);
    return;
  }

  if (data?.url && document.visibilityState === 'visible') {
    window.location.assign(data.url);
  }
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    showDetailAuthError('Configura Supabase en config.js para iniciar sesión.');
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  setDetailAuthOperation(true, 'Iniciando sesión…', 'Estamos cargando la ficha de tu biblioteca.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setDetailAuthOperation(false);
    showDetailAuthError(error);
    return;
  }

  state.user = data.session?.user || data.user || null;
  updateAuthButton();
  closeDialog(elements.authDialog);
  elements.detail.hidden = true;
  elements.loading.hidden = false;
  elements.loading.textContent = 'Cargando ficha del libro…';
  await loadBook();
  setDetailAuthOperation(false);
  showToast('Sesión iniciada.');
}

async function handleAuthButton() {
  if (state.user && supabaseClient) {
    setDetailAuthOperation(true, 'Cerrando sesión…', 'Espera hasta que tu biblioteca quede protegida.');
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) {
      setDetailAuthOperation(false);
      showToast(`No se pudo cerrar la sesión: ${error.message}`);
      return;
    }

    state.user = null;
    updateAuthButton();
    elements.detail.hidden = true;
    elements.loading.hidden = false;
    elements.loading.textContent = 'Cerrando la ficha privada…';
    await loadBook();
    setDetailAuthOperation(false);
    showToast('Sesión cerrada.');
    return;
  }

  elements.authMessage.textContent = '';
  elements.authMessage.className = 'form-message';
  showDialog(elements.authDialog);
}

function updateAuthButton() {
  elements.authButton.textContent = state.user ? 'Salir' : 'Entrar';
  elements.authButton.title = state.user ? `Sesión iniciada como ${state.user.email || 'Google'}` : 'Iniciar sesión';
}

function bindEvents() {
  elements.editToggle.addEventListener('click', () => {
    elements.editPanel.hidden = false;
    elements.editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.cancelEdit.addEventListener('click', () => {
    fillEditForm();
    elements.editPanel.hidden = true;
  });
  elements.form.addEventListener('submit', saveChanges);
  elements.deleteButton.addEventListener('click', deleteBook);
  elements.authButton.addEventListener('click', handleAuthButton);
  elements.authForm.addEventListener('submit', signIn);
  document.querySelector('#google-auth-button')?.addEventListener('click', signInWithGoogle);
  elements.closeAuth.addEventListener('click', () => closeDialog(elements.authDialog));
  elements.authDialog.addEventListener('click', event => { if (event.target === elements.authDialog) closeDialog(elements.authDialog); });
  elements.authDialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
  document.querySelector('#edit-page-count').addEventListener('input', () => syncDetailProgress('pages'));
  document.querySelector('#edit-current-page').addEventListener('input', () => syncDetailProgress('pages'));
  document.querySelector('#edit-progress-percent').addEventListener('input', () => syncDetailProgress('percent'));
  document.querySelector('#edit-cover-file').addEventListener('change', previewDetailCover);
  document.querySelector('#edit-status').addEventListener('change', event => {
    const total = document.querySelector('#edit-page-count');
    const current = document.querySelector('#edit-current-page');
    const percent = document.querySelector('#edit-progress-percent');
    if (event.target.value === 'finished' && total.value) {
      current.value = total.value;
      percent.value = 100;
    }
    syncDetailProgress('pages');
  });
}

async function initialize() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.3.0'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();

  if (!supabaseClient) {
    updateAuthButton();
    await loadBook();
    return;
  }

  const [{ data }] = await Promise.all([
    supabaseClient.auth.getSession(),
    window.checkGoogleAuthAvailability?.()
  ]);
  state.user = data.session?.user || null;

  const oauthError = window.readOAuthError?.();
  if (oauthError) {
    showDialog(elements.authDialog);
    showDetailAuthError(oauthError);
  }

  updateAuthButton();
  if (state.user && window.completeAuthReturn?.(state.user)) return;
  await loadBook();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    state.user = session?.user || null;
    updateAuthButton();

    if (event === 'SIGNED_IN') {
      closeDialog(elements.authDialog);
      if (window.completeAuthReturn?.(state.user)) return;
    }

    if (!authOperationInProgress) {
      elements.detail.hidden = true;
      elements.loading.hidden = false;
      elements.loading.textContent = 'Cargando ficha del libro…';
      loadBook();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
