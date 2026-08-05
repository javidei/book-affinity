let authOperationInProgress = false;

function detailAuthErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('email not confirmed')) return 'Tu correo todavía no está confirmado.';
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

function showDetailAuthConfirmation(options) {
  if (typeof window.showConfirmationPopup === 'function') {
    window.showConfirmationPopup(options);
    return;
  }
  showToast(options.message || options.title || 'Operación completada.');
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    showDetailAuthError('Configura Supabase en config.js para iniciar sesión.');
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  let confirmation = null;

  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  setDetailAuthOperation(true, 'Iniciando sesión…', 'Estamos cargando la ficha de tu biblioteca.');

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
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
    elements.authMessage.textContent = '';
    confirmation = {
      eyebrow: 'Sesión iniciada',
      title: 'Bienvenido',
      message: `Has iniciado sesión como ${state.user?.email || email}. Ya puedes consultar y editar tu biblioteca privada.`,
      icon: '✓',
      variant: 'success',
      buttonLabel: 'Continuar'
    };
  } catch (error) {
    showDetailAuthError(error);
  } finally {
    setDetailAuthOperation(false);
  }

  if (confirmation) showDetailAuthConfirmation(confirmation);
}

async function handleAuthButton() {
  if (state.user && supabaseClient) {
    let confirmation = null;
    setDetailAuthOperation(true, 'Cerrando sesión…', 'Espera hasta que tu biblioteca quede protegida.');

    try {
      const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
      if (error) {
        showToast(`No se pudo cerrar la sesión: ${error.message}`);
        return;
      }

      state.user = null;
      updateAuthButton();
      elements.detail.hidden = true;
      elements.loading.hidden = false;
      elements.loading.textContent = 'Cerrando la ficha privada…';
      await loadBook();
      confirmation = {
        eyebrow: 'Sesión cerrada',
        title: 'Hasta pronto',
        message: 'La sesión se ha cerrado correctamente y tu biblioteca privada vuelve a estar protegida.',
        icon: '✓',
        variant: 'neutral',
        buttonLabel: 'Aceptar'
      };
    } catch (error) {
      showToast(`No se pudo cerrar la sesión: ${error.message || error}`);
    } finally {
      setDetailAuthOperation(false);
    }

    if (confirmation) showDetailAuthConfirmation(confirmation);
    return;
  }

  elements.authMessage.textContent = '';
  elements.authMessage.className = 'form-message';
  showDialog(elements.authDialog);
}

function updateAuthButton() {
  elements.authButton.textContent = state.user ? 'Salir' : 'Entrar';
  elements.authButton.title = state.user ? `Sesión iniciada como ${state.user.email || 'usuario'}` : 'Iniciar sesión';
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
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.3.2'} · ${config.webReleaseDate || '05/08/2026'}`;
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
