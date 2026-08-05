const AUTH_REDIRECT_URL = new URL('./', window.location.href).href;

function detailAuthErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('email not confirmed')) return 'Tu correo todavía no está confirmado.';
  if (message.includes('provider is not enabled')) return 'El acceso con Google todavía no está activado en Supabase.';
  return error?.message || 'No se ha podido iniciar sesión.';
}

async function signInWithGoogle() {
  if (!configured) return;
  elements.authMessage.textContent = 'Abriendo Google…';
  elements.authMessage.className = 'form-message';
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT_URL, queryParams: { prompt: 'select_account' } }
  });
  if (error) {
    elements.authMessage.textContent = detailAuthErrorMessage(error);
    elements.authMessage.className = 'form-message is-error';
  }
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    elements.authMessage.textContent = 'Configura Supabase en config.js para iniciar sesión.';
    return;
  }
  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    elements.authMessage.textContent = detailAuthErrorMessage(error);
    elements.authMessage.className = 'form-message is-error';
    return;
  }
  closeDialog(elements.authDialog);
}

async function handleAuthButton() {
  if (state.user && supabaseClient) {
    await supabaseClient.auth.signOut();
    return;
  }
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
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.2.0'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();
  if (!supabaseClient) {
    updateAuthButton();
    await loadBook();
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user || null;
  updateAuthButton();
  await loadBook();
  supabaseClient.auth.onAuthStateChange((event, session) => {
    state.user = session?.user || null;
    updateAuthButton();
    if (event === 'SIGNED_IN') closeDialog(elements.authDialog);
    elements.detail.hidden = true;
    elements.loading.hidden = false;
    elements.loading.textContent = 'Cargando ficha del libro…';
    loadBook();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
