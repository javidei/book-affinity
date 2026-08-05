// Popup compartido para confirmaciones importantes de Book Affinity.
(() => {
  function syncModalState() {
    const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));
    document.body.classList.toggle('has-modal', hasOpenDialog);
  }

  function ensureConfirmationDialog() {
    let dialog = document.querySelector('#confirmation-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'confirmation-dialog';
    dialog.className = 'modal confirmation-popup';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    dialog.setAttribute('aria-describedby', 'confirmation-message');
    dialog.innerHTML = `
      <div class="dialog-card dialog-card--confirmation">
        <div class="confirmation-popup__icon" aria-hidden="true">✓</div>
        <p class="eyebrow eyebrow--dark" id="confirmation-eyebrow">Operación completada</p>
        <h2 id="confirmation-title">Listo</h2>
        <p id="confirmation-message">La operación se ha completado correctamente.</p>
        <div class="dialog-actions dialog-actions--center">
          <button class="button button--primary" id="confirmation-close" type="button">Aceptar</button>
        </div>
      </div>`;

    const close = () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else {
        dialog.removeAttribute('open');
        syncModalState();
      }
    };

    dialog.querySelector('#confirmation-close')?.addEventListener('click', close);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('close', () => {
      syncModalState();
      const callback = dialog._confirmationOnClose;
      dialog._confirmationOnClose = null;
      if (typeof callback === 'function') callback();
    });

    document.body.append(dialog);
    return dialog;
  }

  window.showConfirmationPopup = (options = {}) => {
    const {
      eyebrow = 'Operación completada',
      title = 'Listo',
      message = 'La operación se ha completado correctamente.',
      icon = '✓',
      variant = 'success',
      buttonLabel = 'Aceptar',
      onClose = null
    } = options;

    const dialog = ensureConfirmationDialog();
    const eyebrowNode = dialog.querySelector('#confirmation-eyebrow');
    const titleNode = dialog.querySelector('#confirmation-title');
    const messageNode = dialog.querySelector('#confirmation-message');
    const iconNode = dialog.querySelector('.confirmation-popup__icon');
    const closeButton = dialog.querySelector('#confirmation-close');

    dialog.dataset.variant = variant;
    dialog._confirmationOnClose = onClose;
    if (eyebrowNode) eyebrowNode.textContent = eyebrow;
    if (titleNode) titleNode.textContent = title;
    if (messageNode) messageNode.textContent = message;
    if (iconNode) iconNode.textContent = icon;
    if (closeButton) closeButton.textContent = buttonLabel;

    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    document.body.classList.add('has-modal');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    window.setTimeout(() => closeButton?.focus(), 50);
  };

  window.showSaveConfirmation = (message = 'Los cambios se han guardado correctamente.', options = {}) => {
    const warning = Boolean(options.warning);
    window.showConfirmationPopup({
      eyebrow: warning ? 'Datos guardados con aviso' : 'Cambios guardados',
      title: warning ? 'Guardado con aviso' : 'Guardado',
      message,
      icon: warning ? '!' : '✓',
      variant: warning ? 'warning' : 'success'
    });
  };
})();
