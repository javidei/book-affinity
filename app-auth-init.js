async function signIn(event) {
  event.preventDefault();
  if (!configured) {
    elements.authMessage.textContent = 'Primero configura Supabase en config.js.';
    elements.authMessage.className = 'form-message is-error';
    return;
  }

  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  elements.authMessage.textContent = 'Iniciando sesión…';
  elements.authMessage.className = 'form-message';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    elements.authMessage.textContent = error.message;
    elements.authMessage.className = 'form-message is-error';
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
  elements.authMessage.textContent = 'Creando cuenta…';
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    elements.authMessage.textContent = error.message;
    elements.authMessage.className = 'form-message is-error';
    return;
  }
  elements.authMessage.textContent = data.session
    ? 'Cuenta creada y sesión iniciada.'
    : 'Cuenta creada. Revisa tu correo para confirmar el acceso.';
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

  elements.bookForm?.addEventListener('submit', saveBook);
  elements.googleForm?.addEventListener('submit', searchGoogleBooks);
  elements.authForm?.addEventListener('submit', signIn);
  elements.signupButton?.addEventListener('click', signUp);
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

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('#year').textContent = new Date().getFullYear();
  document.querySelector('#web-version').textContent = `Versión ${config.webVersion || '0.1.0'} · ${config.webReleaseDate || '05/08/2026'}`;
  bindEvents();
  await initializeAuth();
});
