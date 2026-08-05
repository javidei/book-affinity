async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    elements.authMessage.textContent = 'Configura Supabase en config.js para iniciar sesión.';
    return;
  }
  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  elements.authMessage.textContent = 'Iniciando sesión…';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    elements.authMessage.textContent = error.message;
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
  elements.authButton.title = state.user ? `Sesión iniciada como ${state.user.email}` : 'Iniciar sesión';
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
  elements.closeAuth.addEventListener('click', () => closeDialog(elements.authDialog));
  elements.authDialog.addEventListener('click', event => {
    if (event.target === elements.authDialog) closeDialog(elements.authDialog);
  });
  elements.authDialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
  document.querySelector('#edit-status').addEventListener('change', event => {
    const total = document.querySelector('#edit-page-count');
    const current = document.querySelector('#edit-current-page');
    if (event.target.value === 'finished' && total.value) current.value = total.value;
  });
}

async function initialize() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.1.0'} · ${config.webReleaseDate || '05/08/2026'}`;
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

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    updateAuthButton();
    elements.detail.hidden = true;
    elements.loading.hidden = false;
    elements.loading.textContent = 'Cargando ficha del libro…';
    loadBook();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
