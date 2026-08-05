// Gestión compartida de la cuenta de Book Affinity.
(() => {
  const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
  let availabilityRequest = 0;
  let availabilityTimer = 0;

  window.bookAffinityProfile = null;

  function showPopup(options) {
    if (typeof window.showConfirmationPopup === 'function') {
      window.showConfirmationPopup(options);
    } else if (typeof showToast === 'function') {
      showToast(options.message || options.title || 'Operación completada.');
    }
  }

  function accountErrorMessage(error) {
    const message = String(error?.message || error || '');
    const normalized = message.toLowerCase();
    if (error?.code === '23505' || normalized.includes('ya está en uso') || normalized.includes('duplicate') || normalized.includes('unique')) {
      return 'Ese nombre de usuario ya está en uso.';
    }
    if (normalized.includes('invalid login credentials') || normalized.includes('current_password') || normalized.includes('current password')) {
      return 'La contraseña actual no es correcta.';
    }
    if (normalized.includes('weak password')) return 'La nueva contraseña no cumple los requisitos de seguridad.';
    if (normalized.includes('could not find the function') || normalized.includes('schema cache') || normalized.includes('relation "public.profiles"')) {
      return 'Falta ejecutar supabase/account.sql en Supabase.';
    }
    return message || 'No se pudo completar la operación.';
  }

  function closeAccountDialog(dialog) {
    if (typeof closeDialog === 'function') closeDialog(dialog);
  }

  function ensureAccountDialog() {
    let dialog = document.querySelector('#account-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'account-dialog';
    dialog.className = 'modal account-dialog';
    dialog.setAttribute('aria-labelledby', 'account-title');
    dialog.innerHTML = `
      <div class="dialog-card dialog-card--account">
        <div class="dialog-heading">
          <div><p class="eyebrow eyebrow--dark">Cuenta personal</p><h2 id="account-title">Mi cuenta</h2></div>
          <button class="icon-button" id="account-close" type="button" aria-label="Cerrar">×</button>
        </div>

        <div class="account-identity">
          <span>Correo vinculado</span>
          <strong id="account-email">—</strong>
        </div>

        <section class="account-section" aria-labelledby="username-title">
          <h3 id="username-title">Nombre de usuario</h3>
          <p>Podrás usarlo en lugar del correo para iniciar sesión.</p>
          <form id="username-form">
            <label class="field"><span>Usuario</span><input id="account-username" type="text" minlength="3" maxlength="24" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Ej. javi"></label>
            <p class="account-hint">Entre 3 y 24 caracteres. Solo letras, números y guion bajo.</p>
            <p class="form-message account-status" id="username-status" aria-live="polite"></p>
            <div class="dialog-actions"><button class="button button--primary" id="username-save" type="submit" disabled>Guardar usuario</button></div>
          </form>
        </section>

        <section class="account-section" aria-labelledby="password-title">
          <h3 id="password-title">Cambiar contraseña</h3>
          <p>Introduce la contraseña actual para confirmar que eres tú.</p>
          <form id="password-form">
            <label class="field"><span>Contraseña actual</span><input id="current-password" type="password" autocomplete="current-password" required></label>
            <label class="field"><span>Nueva contraseña</span><input id="new-password" type="password" autocomplete="new-password" minlength="8" required></label>
            <label class="field"><span>Repetir nueva contraseña</span><input id="confirm-password" type="password" autocomplete="new-password" minlength="8" required></label>
            <p class="form-message" id="password-status" aria-live="polite"></p>
            <div class="dialog-actions"><button class="button button--primary" type="submit">Cambiar contraseña</button></div>
          </form>
        </section>

        <div class="account-footer-actions"><button class="button button--danger" id="account-signout" type="button">Cerrar sesión</button></div>
      </div>`;

    const close = () => closeAccountDialog(dialog);
    dialog.querySelector('#account-close')?.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
    dialog.querySelector('#username-form')?.addEventListener('submit', saveUsername);
    dialog.querySelector('#password-form')?.addEventListener('submit', changePassword);
    dialog.querySelector('#account-username')?.addEventListener('input', scheduleUsernameCheck);
    dialog.querySelector('#account-signout')?.addEventListener('click', async () => {
      close();
      await window.bookAffinitySignOut?.();
    });

    document.body.append(dialog);
    return dialog;
  }

  function setUsernameStatus(message, statusName = '') {
    const dialog = ensureAccountDialog();
    const status = dialog.querySelector('#username-status');
    const save = dialog.querySelector('#username-save');
    status.textContent = message;
    status.className = `form-message account-status${statusName ? ` is-${statusName}` : ''}`;
    save.disabled = statusName !== 'success';
  }

  async function readFunctionError(error) {
    try {
      if (error?.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        return body?.error || body?.message || error.message;
      }
    } catch (_) {
      // La respuesta puede no incluir JSON.
    }
    return error?.message || 'No se pudo iniciar sesión con ese usuario.';
  }

  window.bookAffinitySignIn = async (identifier, password) => {
    const cleanIdentifier = String(identifier || '').trim();
    if (cleanIdentifier.includes('@')) {
      return supabaseClient.auth.signInWithPassword({ email: cleanIdentifier, password });
    }

    const username = cleanIdentifier.toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      return { data: null, error: new Error('El usuario debe tener entre 3 y 24 caracteres y solo puede contener letras, números y guion bajo.') };
    }

    const { data, error } = await supabaseClient.functions.invoke('username-login', {
      body: { identifier: username, password }
    });

    if (error) return { data: null, error: new Error(await readFunctionError(error)) };
    if (!data?.access_token || !data?.refresh_token) {
      return { data: null, error: new Error(data?.error || 'El acceso por usuario todavía no está configurado.') };
    }

    return supabaseClient.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
  };

  window.loadAccountProfile = async () => {
    if (!state?.user || !supabaseClient) {
      window.bookAffinityProfile = null;
      return null;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo cargar el perfil. Ejecuta supabase/account.sql.', error);
      window.bookAffinityProfile = null;
      return null;
    }

    window.bookAffinityProfile = data || { username: null };
    return window.bookAffinityProfile;
  };

  async function checkUsernameAvailability(value) {
    const username = String(value || '').trim().toLowerCase();
    const current = String(window.bookAffinityProfile?.username || '').toLowerCase();
    const requestId = ++availabilityRequest;

    if (!username) return setUsernameStatus('Escribe el usuario que quieres utilizar.');
    if (!USERNAME_PATTERN.test(username)) return setUsernameStatus('Usa entre 3 y 24 letras, números o guiones bajos.', 'error');
    if (username === current) return setUsernameStatus('Este es tu nombre de usuario actual.');

    setUsernameStatus('Comprobando disponibilidad…');
    const { data, error } = await supabaseClient.rpc('check_username_available', { p_username: username });
    if (requestId !== availabilityRequest) return;
    if (error) return setUsernameStatus(accountErrorMessage(error), 'error');
    setUsernameStatus(data ? 'Usuario disponible.' : 'Ese usuario ya está en uso.', data ? 'success' : 'error');
  }

  function scheduleUsernameCheck(event) {
    window.clearTimeout(availabilityTimer);
    availabilityTimer = window.setTimeout(() => checkUsernameAvailability(event.target.value), 350);
  }

  async function saveUsername(event) {
    event.preventDefault();
    const dialog = ensureAccountDialog();
    const username = dialog.querySelector('#account-username').value.trim().toLowerCase();

    await checkUsernameAvailability(username);
    if (dialog.querySelector('#username-save').disabled) return;

    window.setAppBusy?.(true, 'Guardando usuario…', 'Estamos comprobando que siga disponible.');
    let result;
    try {
      result = await supabaseClient.rpc('set_my_username', { p_username: username });
    } finally {
      window.setAppBusy?.(false);
    }

    if (result.error) return setUsernameStatus(accountErrorMessage(result.error), 'error');

    window.bookAffinityProfile = { username: result.data?.username || username };
    if (typeof updateConnectionState === 'function') updateConnectionState();
    if (typeof updateAuthButton === 'function') updateAuthButton();
    closeAccountDialog(dialog);
    showPopup({
      eyebrow: 'Usuario actualizado',
      title: `@${window.bookAffinityProfile.username}`,
      message: 'Ya puedes iniciar sesión utilizando este usuario o tu correo habitual.',
      icon: '✓',
      variant: 'success',
      buttonLabel: 'Aceptar'
    });
  }

  async function changePassword(event) {
    event.preventDefault();
    const dialog = ensureAccountDialog();
    const current = dialog.querySelector('#current-password').value;
    const next = dialog.querySelector('#new-password').value;
    const confirmation = dialog.querySelector('#confirm-password').value;
    const status = dialog.querySelector('#password-status');

    status.className = 'form-message';
    status.textContent = '';

    if (next.length < 8) {
      status.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.';
      status.classList.add('is-error');
      return;
    }
    if (next !== confirmation) {
      status.textContent = 'Las dos contraseñas nuevas no coinciden.';
      status.classList.add('is-error');
      return;
    }
    if (current === next) {
      status.textContent = 'La nueva contraseña debe ser distinta de la actual.';
      status.classList.add('is-error');
      return;
    }

    window.setAppBusy?.(true, 'Cambiando contraseña…', 'Estamos verificando tu contraseña actual.');
    let result;
    try {
      result = await supabaseClient.auth.updateUser({ password: next, current_password: current });
    } finally {
      window.setAppBusy?.(false);
    }

    if (result.error) {
      status.textContent = accountErrorMessage(result.error);
      status.classList.add('is-error');
      return;
    }

    dialog.querySelector('#password-form').reset();
    closeAccountDialog(dialog);
    showPopup({
      eyebrow: 'Seguridad actualizada',
      title: 'Contraseña cambiada',
      message: 'La nueva contraseña ya está activa para esta cuenta.',
      icon: '✓',
      variant: 'success',
      buttonLabel: 'Aceptar'
    });
  }

  window.openAccountDialog = async () => {
    if (!state?.user) return;
    const dialog = ensureAccountDialog();
    const input = dialog.querySelector('#account-username');
    dialog.querySelector('#account-email').textContent = state.user.email || 'Cuenta de Supabase';
    dialog.querySelector('#username-status').textContent = 'Cargando perfil…';
    dialog.querySelector('#username-save').disabled = true;
    if (typeof showDialog === 'function') showDialog(dialog);

    await window.loadAccountProfile();
    input.value = window.bookAffinityProfile?.username || '';
    setUsernameStatus(input.value ? 'Este es tu nombre de usuario actual.' : 'Todavía no has elegido un nombre de usuario.');
    window.setTimeout(() => input.focus(), 50);
  };

  function initializeAccountUi() {
    const authInput = document.querySelector('#auth-email');
    const label = authInput?.closest('label')?.querySelector('span');
    if (authInput) {
      authInput.type = 'text';
      authInput.autocomplete = 'username';
      authInput.autocapitalize = 'none';
      authInput.spellcheck = false;
      authInput.placeholder = 'Correo o nombre de usuario';
    }
    if (label) label.textContent = 'Correo o usuario';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAccountUi, { once: true });
  else initializeAccountUi();
})();
