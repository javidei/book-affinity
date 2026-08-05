// Gestión compartida de la cuenta de Book Affinity.
(() => {
  const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
  const AVATARS = Array.isArray(window.BOOK_AFFINITY_AVATARS) ? window.BOOK_AFFINITY_AVATARS : [];
  let availabilityRequest = 0;
  let availabilityTimer = 0;

  window.bookAffinityProfile = null;

  function showPopup(options) {
    if (typeof window.showConfirmationPopup === 'function') window.showConfirmationPopup(options);
    else if (typeof showToast === 'function') showToast(options.message || options.title || 'Operación completada.');
  }

  function accountErrorMessage(error) {
    const message = String(error?.message || error || '');
    const normalized = message.toLowerCase();
    if (error?.code === '23505' || normalized.includes('ya está en uso') || normalized.includes('duplicate') || normalized.includes('unique')) {
      return 'Ese nombre de usuario ya está en uso.';
    }
    if (normalized.includes('invalid login credentials') || normalized.includes('current password')) {
      return 'La contraseña actual no es correcta.';
    }
    if (normalized.includes('weak password')) return 'La nueva contraseña no cumple los requisitos de seguridad.';
    if (normalized.includes('could not find the function') || normalized.includes('schema cache') || normalized.includes('book_affinity_profiles')) {
      return 'Falta ejecutar la versión actual de supabase/account.sql en Supabase.';
    }
    return message || 'No se pudo completar la operación.';
  }

  function currentAvatarId() {
    return String(state?.user?.user_metadata?.book_affinity_avatar || '');
  }

  function avatarById(id) {
    return AVATARS.find(avatar => avatar.id === id) || null;
  }

  function getConnectedIdentity() {
    const username = String(window.bookAffinityProfile?.username || '').trim();
    const email = String(state?.user?.email || '').trim();
    const rawName = username || email.split('@')[0] || 'usuario';
    return {
      username,
      email,
      label: username ? `@${username}` : (email || 'Cuenta conectada'),
      initial: rawName.charAt(0).toUpperCase() || 'U',
      avatar: avatarById(currentAvatarId())
    };
  }

  function closeAccountDialog(dialog) {
    if (typeof closeDialog === 'function') closeDialog(dialog);
  }

  function paintAvatar(target, identity) {
    if (!target) return;
    target.replaceChildren();
    if (identity.avatar) {
      const image = document.createElement('img');
      image.src = identity.avatar.src;
      image.alt = '';
      image.width = 64;
      image.height = 64;
      target.append(image);
    } else {
      target.textContent = identity.initial;
    }
  }

  function fillAccountIdentity(dialog) {
    const identity = getConnectedIdentity();
    paintAvatar(dialog.querySelector('#account-avatar'), identity);
    const displayName = dialog.querySelector('#account-display-name');
    const email = dialog.querySelector('#account-email');
    if (displayName) displayName.textContent = identity.label;
    if (email) email.textContent = identity.email || 'Cuenta de Supabase';
  }

  function ensureSignOutDialog() {
    let dialog = document.querySelector('#signout-confirm-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'signout-confirm-dialog';
    dialog.className = 'modal signout-confirmation';
    dialog.setAttribute('aria-labelledby', 'signout-confirm-title');
    dialog.setAttribute('aria-describedby', 'signout-confirm-message');
    dialog.innerHTML = `
      <div class="dialog-card dialog-card--confirmation">
        <div class="signout-confirmation__icon" aria-hidden="true">↪</div>
        <p class="eyebrow eyebrow--dark">Proteger biblioteca</p>
        <h2 id="signout-confirm-title">¿Cerrar sesión?</h2>
        <p id="signout-confirm-message">Vas a cerrar la sesión de esta cuenta.</p>
        <div class="signout-confirmation__identity" id="signout-confirm-identity"></div>
        <div class="dialog-actions dialog-actions--center signout-confirmation__actions">
          <button class="button button--secondary" id="signout-cancel" type="button">Seguir conectado</button>
          <button class="button button--danger" id="signout-confirm" type="button">Sí, cerrar sesión</button>
        </div>
      </div>`;

    const close = () => closeAccountDialog(dialog);
    dialog.querySelector('#signout-cancel')?.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
    dialog.querySelector('#signout-confirm')?.addEventListener('click', async event => {
      const confirmButton = event.currentTarget;
      const cancelButton = dialog.querySelector('#signout-cancel');
      confirmButton.disabled = true;
      if (cancelButton) cancelButton.disabled = true;
      close();
      try {
        await window.bookAffinitySignOut?.();
      } finally {
        confirmButton.disabled = false;
        if (cancelButton) cancelButton.disabled = false;
      }
    });

    document.body.append(dialog);
    return dialog;
  }

  function openSignOutConfirmation() {
    const accountDialog = document.querySelector('#account-dialog');
    if (accountDialog?.open) closeAccountDialog(accountDialog);
    const dialog = ensureSignOutDialog();
    const identityNode = dialog.querySelector('#signout-confirm-identity');
    if (identityNode) identityNode.textContent = getConnectedIdentity().label;
    if (typeof showDialog === 'function') showDialog(dialog);
    window.setTimeout(() => dialog.querySelector('#signout-cancel')?.focus(), 50);
  }

  function setAvatarStatus(dialog, message, statusName = '') {
    const status = dialog.querySelector('#avatar-status');
    const save = dialog.querySelector('#avatar-save');
    if (status) {
      status.textContent = message;
      status.className = `form-message account-status${statusName ? ` is-${statusName}` : ''}`;
    }
    if (save) save.disabled = statusName !== 'success';
  }

  function selectAvatar(dialog, avatarId) {
    const avatar = avatarById(avatarId);
    if (!avatar) return;
    dialog.dataset.selectedAvatar = avatar.id;
    dialog.querySelectorAll('[data-avatar-id]').forEach(button => {
      const selected = button.dataset.avatarId === avatar.id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
    const same = avatar.id === currentAvatarId();
    setAvatarStatus(dialog, same ? 'Este es tu icono actual.' : `${avatar.name} seleccionado.`, same ? '' : 'success');
  }

  function renderAvatarPicker(dialog) {
    const picker = dialog.querySelector('#avatar-picker');
    if (!picker || picker.childElementCount) return;
    AVATARS.forEach(avatar => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-option';
      button.dataset.avatarId = avatar.id;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.setAttribute('aria-label', avatar.name);

      const image = document.createElement('img');
      image.src = avatar.src;
      image.alt = '';
      image.width = 88;
      image.height = 88;

      const name = document.createElement('span');
      name.textContent = avatar.name;
      button.append(image, name);
      button.addEventListener('click', () => selectAvatar(dialog, avatar.id));
      picker.append(button);
    });
  }

  async function saveAvatar(event) {
    event.preventDefault();
    const dialog = ensureAccountDialog();
    const avatarId = String(dialog.dataset.selectedAvatar || '');
    const avatar = avatarById(avatarId);
    if (!avatar || avatarId === currentAvatarId()) return;

    window.setAppBusy?.(true, 'Guardando icono…', 'Estamos asociando el icono a tu cuenta.');
    let result;
    try {
      result = await supabaseClient.auth.updateUser({ data: { book_affinity_avatar: avatar.id } });
    } finally {
      window.setAppBusy?.(false);
    }

    if (result.error) {
      setAvatarStatus(dialog, accountErrorMessage(result.error), 'error');
      return;
    }

    state.user = result.data.user || state.user;
    fillAccountIdentity(dialog);
    window.refreshConnectedUserUi?.();
    if (typeof updateAuthButton === 'function') updateAuthButton();
    setAvatarStatus(dialog, 'Icono guardado en tu cuenta.');
    closeAccountDialog(dialog);
    showPopup({
      eyebrow: 'Icono actualizado',
      title: avatar.name,
      message: 'La selección se ha guardado en Supabase y aparecerá también en tus otros dispositivos.',
      icon: '✓',
      variant: 'success',
      buttonLabel: 'Aceptar'
    });
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
          <span class="account-identity__avatar" id="account-avatar" aria-hidden="true">U</span>
          <div class="account-identity__copy">
            <span>Sesión activa</span>
            <strong id="account-display-name">Cuenta conectada</strong>
            <small id="account-email">—</small>
          </div>
        </div>

        <section class="account-section account-avatar-section" aria-labelledby="avatar-title">
          <h3 id="avatar-title">Icono de usuario</h3>
          <p>Elige el emblema que aparecerá junto a tu usuario.</p>
          <form id="avatar-form">
            <div class="avatar-picker" id="avatar-picker" role="radiogroup" aria-label="Iconos disponibles"></div>
            <p class="form-message account-status" id="avatar-status" aria-live="polite"></p>
            <div class="dialog-actions"><button class="button button--primary" id="avatar-save" type="submit" disabled>Guardar icono</button></div>
          </form>
        </section>

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

        <section class="account-signout-panel" aria-labelledby="account-signout-title">
          <span class="account-signout-panel__icon" aria-hidden="true">↪</span>
          <div><h3 id="account-signout-title">Cerrar sesión</h3><p>Protege tu biblioteca y elimina la sesión de este dispositivo.</p></div>
          <button class="button button--danger" id="account-signout" type="button">Cerrar sesión</button>
        </section>
      </div>`;

    const close = () => closeAccountDialog(dialog);
    dialog.querySelector('#account-close')?.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
    dialog.querySelector('#avatar-form')?.addEventListener('submit', saveAvatar);
    dialog.querySelector('#username-form')?.addEventListener('submit', saveUsername);
    dialog.querySelector('#password-form')?.addEventListener('submit', changePassword);
    dialog.querySelector('#account-username')?.addEventListener('input', scheduleUsernameCheck);
    dialog.querySelector('#account-signout')?.addEventListener('click', openSignOutConfirmation);
    renderAvatarPicker(dialog);
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
    } catch (_) {}
    return error?.message || 'No se pudo iniciar sesión con ese usuario.';
  }

  window.bookAffinitySignIn = async (identifier, password) => {
    const cleanIdentifier = String(identifier || '').trim();
    if (cleanIdentifier.includes('@')) return supabaseClient.auth.signInWithPassword({ email: cleanIdentifier, password });

    const username = cleanIdentifier.toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      return { data: null, error: new Error('El usuario debe tener entre 3 y 24 caracteres y solo puede contener letras, números y guion bajo.') };
    }

    const { data, error } = await supabaseClient.functions.invoke('username-login', { body: { identifier: username, password } });
    if (error) return { data: null, error: new Error(await readFunctionError(error)) };
    if (!data?.access_token || !data?.refresh_token) {
      return { data: null, error: new Error(data?.error || 'El acceso por usuario todavía no está configurado.') };
    }
    return supabaseClient.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  };

  window.loadAccountProfile = async () => {
    if (!state?.user || !supabaseClient) {
      window.bookAffinityProfile = null;
      window.refreshConnectedUserUi?.();
      return null;
    }

    const { data, error } = await supabaseClient.from('book_affinity_profiles').select('username').eq('user_id', state.user.id).maybeSingle();
    if (error) {
      console.warn('No se pudo cargar el perfil. Ejecuta supabase/account.sql.', error);
      window.bookAffinityProfile = null;
      window.refreshConnectedUserUi?.();
      return null;
    }
    window.bookAffinityProfile = data || { username: null };
    window.refreshConnectedUserUi?.();
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
    const { data, error } = await supabaseClient.rpc('book_affinity_check_username_available', { p_username: username });
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
      result = await supabaseClient.rpc('book_affinity_set_my_username', { p_username: username });
    } finally {
      window.setAppBusy?.(false);
    }
    if (result.error) return setUsernameStatus(accountErrorMessage(result.error), 'error');

    window.bookAffinityProfile = { username: result.data?.username || username };
    window.refreshConnectedUserUi?.();
    if (typeof updateConnectionState === 'function') updateConnectionState();
    if (typeof updateAuthButton === 'function') updateAuthButton();
    closeAccountDialog(dialog);
    showPopup({ eyebrow: 'Usuario actualizado', title: `@${window.bookAffinityProfile.username}`, message: 'Ya puedes iniciar sesión utilizando este usuario o tu correo habitual.', icon: '✓', variant: 'success', buttonLabel: 'Aceptar' });
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

    if (next.length < 8) return Object.assign(status, { textContent: 'La nueva contraseña debe tener al menos 8 caracteres.', className: 'form-message is-error' });
    if (next !== confirmation) return Object.assign(status, { textContent: 'Las dos contraseñas nuevas no coinciden.', className: 'form-message is-error' });
    if (current === next) return Object.assign(status, { textContent: 'La nueva contraseña debe ser distinta de la actual.', className: 'form-message is-error' });

    window.setAppBusy?.(true, 'Cambiando contraseña…', 'Estamos verificando tu contraseña actual.');
    let result;
    try {
      const verification = await supabaseClient.auth.signInWithPassword({ email: state.user.email, password: current });
      if (verification.error) {
        result = verification;
      } else {
        result = await supabaseClient.auth.updateUser({ password: next });
      }
    } finally {
      window.setAppBusy?.(false);
    }

    if (result.error) {
      status.textContent = accountErrorMessage(result.error);
      status.className = 'form-message is-error';
      return;
    }

    dialog.querySelector('#password-form').reset();
    closeAccountDialog(dialog);
    showPopup({ eyebrow: 'Seguridad actualizada', title: 'Contraseña cambiada', message: 'La nueva contraseña ya está activa para esta cuenta.', icon: '✓', variant: 'success', buttonLabel: 'Aceptar' });
  }

  window.openAccountDialog = async () => {
    if (!state?.user) return;
    const dialog = ensureAccountDialog();
    const input = dialog.querySelector('#account-username');
    fillAccountIdentity(dialog);
    renderAvatarPicker(dialog);
    const currentAvatar = currentAvatarId();
    if (currentAvatar) selectAvatar(dialog, currentAvatar);
    else {
      delete dialog.dataset.selectedAvatar;
      dialog.querySelectorAll('[data-avatar-id]').forEach(button => {
        button.classList.remove('is-selected');
        button.setAttribute('aria-checked', 'false');
      });
      setAvatarStatus(dialog, 'Todavía no has elegido un icono.');
    }

    dialog.querySelector('#username-status').textContent = 'Cargando perfil…';
    dialog.querySelector('#username-save').disabled = true;
    if (typeof showDialog === 'function') showDialog(dialog);

    await window.loadAccountProfile();
    fillAccountIdentity(dialog);
    input.value = window.bookAffinityProfile?.username || '';
    setUsernameStatus(input.value ? 'Este es tu nombre de usuario actual.' : 'Todavía no has elegido un nombre de usuario.');
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
    window.refreshConnectedUserUi?.();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAccountUi, { once: true });
  else initializeAccountUi();
})();
