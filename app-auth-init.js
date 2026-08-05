const AUTH_REDIRECT_URL = config.siteUrl || new URL('./', window.location.href).href;
let authOperationInProgress = false;

function authErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('invalid login credentials') || message.includes('usuario o contraseña incorrectos')) return 'Usuario, correo o contraseña incorrectos.';
  if (message.includes('email not confirmed')) return 'Tu correo todavía no está confirmado. Revisa la bandeja de entrada o reenvía el mensaje.';
  if (message.includes('email address not authorized')) return 'El servicio de correo de Supabase no permite enviar a este destinatario. Puedes crear el usuario manualmente desde Supabase o configurar un SMTP propio.';
  if (message.includes('rate limit')) return 'Se ha alcanzado el límite temporal de intentos. Espera un poco antes de volver a probar.';
  if (message.includes('user already registered')) return 'Ya existe una cuenta con este correo. Inicia sesión o reenvía la confirmación.';
  if (message.includes('function') || message.includes('username-login') || message.includes('configured')) return 'El acceso por nombre de usuario todavía no está desplegado en Supabase. Puedes entrar con tu correo mientras se configura.';
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

function showAuthConfirmation(options) {
  if (typeof window.showConfirmationPopup === 'function') {
    window.showConfirmationPopup(options);
    return;
  }
  showToast(options.message || options.title || 'Operación completada.');
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

async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    showAuthError('Primero configura Supabase en config.js.');
    return;
  }

  const identifier = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  let confirmation = null;

  if (!identifier || !password) {
    showAuthError('Escribe tu correo o usuario y la contraseña.');
    return;
  }

  setResendVisible(false);
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  setAuthOperation(true, 'Iniciando sesión…', 'Estamos cargando tu biblioteca personal.');

  try {
    const { data, error } = await window.bookAffinitySignIn(identifier, password);
    if (error) {
      showAuthError(error);
      setResendVisible(String(error.message || '').toLowerCase().includes('email not confirmed'));
      return;
    }

    state.user = data.session?.user || data.user || null;
    await window.loadAccountProfile?.();
    updateConnectionState();
    updateAuthButton();
    closeDialog(elements.authDialog);
    await loadLibrary();
    elements.authMessage.textContent = '';
    confirmation = {
      eyebrow: 'Sesión iniciada',
      title: 'Bienvenido',
      message: `Has iniciado sesión como ${window.bookAffinityProfile?.username ? `@${window.bookAffinityProfile.username}` : state.user?.email || identifier}. Tu biblioteca personal ya está disponible.`,
      icon: '✓',
      variant: 'success',
      buttonLabel: 'Continuar'
    };
  } catch (error) {
    showAuthError(error);
  } finally {
    setAuthOperation(false);
  }

  if (confirmation) showAuthConfirmation(confirmation);
}

async function signUp() {
  if (!configured) {
    showAuthError('Primero configura Supabase en config.js.');
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const passwordInput = document.querySelector('#auth-password');
  const password = passwordInput.value;
  let confirmation = null;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    showAuthError('Para crear una cuenta nueva debes escribir un correo electrónico válido.');
    return;
  }
  if (password.length < 6) {
    showAuthError('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  setResendVisible(false);
  elements.authMessage.textContent = 'Creando cuenta…';
  elements.authMessage.className = 'form-message';
  setAuthOperation(true, 'Creando cuenta…', 'Estamos preparando tu biblioteca personal.');

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL }
    });

    if (error) {
      showAuthError(error);
      setResendVisible(String(error.message || '').toLowerCase().includes('already registered') || String(error.message || '').toLowerCase().includes('not confirmed'));
      return;
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      showAuthError('Ya existe una cuenta con este correo. Prueba a iniciar sesión.');
      return;
    }

    passwordInput.value = '';
    elements.authMessage.textContent = '';
    closeDialog(elements.authDialog);

    if (data.session) {
      state.user = data.session.user;
      await window.loadAccountProfile?.();
      updateConnectionState();
      updateAuthButton();
      await loadLibrary();
      confirmation = {
        eyebrow: 'Cuenta creada',
        title: 'Todo listo',
        message: `La cuenta ${email} se ha creado correctamente. En Mi cuenta puedes elegir ahora un nombre de usuario.`,
        icon: '✓',
        variant: 'success',
        buttonLabel: 'Entrar en mi biblioteca'
      };
    } else {
      setResendVisible(true);
      confirmation = {
        eyebrow: 'Cuenta creada',
        title: 'Revisa tu correo',
        message: `Hemos enviado un enlace de confirmación a ${email}. Ábrelo antes de iniciar sesión.`,
        icon: '✉',
        variant: 'info',
        buttonLabel: 'Entendido'
      };
    }
  } catch (error) {
    showAuthError(error);
  } finally {
    setAuthOperation(false);
  }

  if (confirmation) showAuthConfirmation(confirmation);
}

async function resendConfirmation() {
  if (!configured) return;
  const email = document.querySelector('#auth-email').value.trim();
  if (!email.includes('@')) {
    showAuthError('Escribe el correo de la cuenta para reenviar la confirmación.');
    return;
  }

  const button = ensureResendButton();
  button.disabled = true;
  elements.authMessage.textContent = 'Reenviando confirmación…';
  elements.authMessage.className = 'form-message';
  let confirmation = null;

  try {
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: AUTH_REDIRECT_URL }
    });

    if (error) {
      showAuthError(error);
      return;
    }

    elements.authMessage.textContent = '';
    closeDialog(elements.authDialog);
    confirmation = {
      eyebrow: 'Correo enviado',
      title: 'Revisa tu bandeja',
      message: `Hemos vuelto a enviar el enlace de confirmación a ${email}. Revisa también Spam y Promociones.`,
      icon: '✉',
      variant: 'info',
      buttonLabel: 'Entendido'
    };
  } catch (error) {
    showAuthError(error);
  } finally {
    button.disabled = false;
  }

  if (confirmation) showAuthConfirmation(confirmation);
}

async function performSignOut() {
  if (!state.user || !supabaseClient) return;
  let confirmation = null;
  setAuthOperation(true, 'Cerrando sesión…', 'Espera hasta que tu biblioteca quede protegida.');

  try {
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) {
      showToast(`No se pudo cerrar la sesión: ${error.message}`);
      return;
    }

    state.user = null;
    window.bookAffinityProfile = null;
    updateConnectionState();
    updateAuthButton();
    await loadLibrary();
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
    setAuthOperation(false);
  }

  if (confirmation) showAuthConfirmation(confirmation);
}

window.bookAffinitySignOut = performSignOut;

async function handleAuthButton() {
  if (state.user) {
    await window.openAccountDialog?.();
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
  ensureResendButton().addEventListener('click', resendConfirmation);
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
  if (state.user) await window.loadAccountProfile?.();
  updateConnectionState();
  updateAuthButton();
  await loadLibrary();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    state.user = session?.user || null;
    if (!state.user) window.bookAffinityProfile = null;

    const refreshUi = () => {
      updateConnectionState();
      updateAuthButton();
      if (event === 'SIGNED_IN') closeDialog(elements.authDialog);
      if (!authOperationInProgress) loadLibrary();
    };

    if (state.user) window.loadAccountProfile?.().finally(refreshUi);
    else refreshUi();
  });
}

async function startApplication() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.4.0'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();
  await initializeAuth();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApplication, { once: true });
else startApplication();
