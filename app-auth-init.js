const AUTH_REDIRECT_URL = new URL('./', window.location.href).href;

function authErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Si acabas de crear la cuenta, confirma primero el correo.';
  }
  if (message.includes('email not confirmed')) {
    return 'Tu correo todavía no está confirmado. Revisa la bandeja de entrada o reenvía el mensaje.';
  }
  if (message.includes('email address not authorized')) {
    return 'Supabase no tiene autorizado este destinatario. Configura un SMTP propio o autoriza el correo en el equipo del proyecto.';
  }
  if (message.includes('rate limit') || message.includes('email rate limit exceeded')) {
    return 'Se ha alcanzado el límite temporal de correos de Supabase. Espera un poco antes de reenviarlo.';
  }
  if (message.includes('user already registered')) {
    return 'Ya existe una cuenta con este correo. Inicia sesión o reenvía la confirmación.';
  }

  return error?.message || 'No se ha podido completar la operación.';
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

  const actions = elements.authForm?.querySelector('.dialog-actions');
  if (actions) actions.prepend(button);
  return button;
}

function setResendVisible(visible) {
  const button = ensureResendButton();
  button.hidden = !visible;
}

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    elements.authMessage.textContent = 'Primero configura Supabase en config.js.';
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  setResendVisible(false);
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    elements.authMessage.textContent = authErrorMessage(error);
    elements.authMessage.className = 'form-message is-error';
    setResendVisible(String(error.message || '').toLowerCase().includes('email not confirmed'));
    return;
  }

  closeDialog(elements.authDialog);
  showToast('Sesión iniciada.');
}

async function signUp() {
  if (!configured) {
    elements.authMessage.textContent = 'Primero configura Supabase en config.js.';
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  if (!email || password.length < 6) {
    elements.authMessage.textContent = 'Indica un correo válido y una contraseña de al menos 6 caracteres.';
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  setResendVisible(false);
  elements.authMessage.textContent = 'Creando cuenta…';
  elements.authMessage.className = 'form-message';

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL
    }
  });

  if (error) {
    elements.authMessage.textContent = authErrorMessage(error);
    elements.authMessage.className = 'form-message is-error';
    setResendVisible(
      String(error.message || '').toLowerCase().includes('already registered')
      || String(error.message || '').toLowerCase().includes('not confirmed')
    );
    return;
  }

  if (data.session) {
    elements.authMessage.textContent = 'Cuenta creada y sesión iniciada.';
    elements.authMessage.className = 'form-message is-success';
    setResendVisible(false);
    return;
  }

  elements.authMessage.textContent = 'Cuenta creada. Te hemos enviado un enlace de confirmación. Revisa también Spam y Promociones.';
  elements.authMessage.className = 'form-message is-success';
  setResendVisible(true);
}

async function resendConfirmation() {
  if (!configured) return;

  const email = document.querySelector('#auth-email').value.trim();
  if (!email) {
    elements.authMessage.textContent = 'Escribe primero el correo de la cuenta.';
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  const button = ensureResendButton();
  button.disabled = true;
  elements.authMessage.textContent = 'Reenviando confirmación…';
  elements.authMessage.className = 'form-message';

  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL
    }
  });

  button.disabled = false;
  if (error) {
    elements.authMessage.textContent = authErrorMessage(error);
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  elements.authMessage.textContent = 'Correo reenviado. Revisa la bandeja de entrada, Spam y Promociones.';
  elements.authMessage.className = 'form-message is-success';
}

async function handleAuthButton() {
  if (state.user && supabaseClient) {
    await supabaseClient.auth.signOut();
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

  document.querySelectorAll('#open-book-form, #open-book-form-secondary, #footer-add-book').forEach(button => {
    button.addEventListener('click', () => openBookForm());
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeDialog)));
  });
  [elements.bookDialog, elements.authDialog].forEach(dialog => {
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog?.addEventListener('close', () => document.body.classList.remove('has-modal'));
  });

  elements.librarySearch?.addEventListener('input', () => {
    state.query = elements.librarySearch.value.trim();
    renderLibrary();
  });
  elements.filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.libraryFilter;
      elements.filterButtons.forEach(item => item.classList.toggle('is-active', item === button));
      renderLibrary();
    });
  });
  document.querySelector('#book-page-count')?.addEventListener('input', updateFormProgress);
  document.querySelector('#book-current-page')?.addEventListener('input', updateFormProgress);
  document.querySelector('#book-status')?.addEventListener('change', event => {
    const total = document.querySelector('#book-page-count');
    const current = document.querySelector('#book-current-page');
    if (event.target.value === 'finished' && total.value) current.value = total.value;
    updateFormProgress();
  });

  const resendButton = ensureResendButton();
  elements.bookForm?.addEventListener('submit', saveBook);
  elements.googleForm?.addEventListener('submit', searchGoogleBooks);
  elements.authForm?.addEventListener('submit', signIn);
  elements.signupButton?.addEventListener('click', signUp);
  resendButton?.addEventListener('click', resendConfirmation);
  elements.authButton?.addEventListener('click', handleAuthButton);
}

async function initializeAuth() {
  if (!supabaseClient) {
    updateConnectionState();
    updateAuthButton();
    await loadLibrary();
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  state.user = data.session?.user || null;
  updateConnectionState();
  updateAuthButton();
  await loadLibrary();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    updateConnectionState();
    updateAuthButton();
    loadLibrary();
  });
}

async function startApplication() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.1.1'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();
  await initializeAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication, { once: true });
} else {
  startApplication();
}
