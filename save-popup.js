// Popup compartido para confirmar guardados en Book Affinity.
(() => {
  function ensureSaveDialog() {
    let dialog = document.querySelector('#save-confirmation-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'save-confirmation-dialog';
    dialog.className = 'modal save-confirmation';
    dialog.setAttribute('aria-labelledby', 'save-confirmation-title');
    dialog.setAttribute('aria-describedby', 'save-confirmation-message');
    dialog.innerHTML = `
      <div class="dialog-card dialog-card--confirmation">
        <div class="save-confirmation__icon" aria-hidden="true">✓</div>
        <p class="eyebrow eyebrow--dark">Cambios guardados</p>
        <h2 id="save-confirmation-title">Guardado correctamente</h2>
        <p id="save-confirmation-message">Los cambios se han guardado correctamente.</p>
        <div class="dialog-actions dialog-actions--center">
          <button class="button button--primary" id="save-confirmation-close" type="button">Aceptar</button>
        </div>
      </div>`;

    const close = () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      document.body.classList.remove('has-modal');
    };

    dialog.querySelector('#save-confirmation-close')?.addEventListener('click', close);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
    document.body.append(dialog);
    return dialog;
  }

  window.showSaveConfirmation = (message = 'Los cambios se han guardado correctamente.', options = {}) => {
    const dialog = ensureSaveDialog();
    const warning = Boolean(options.warning);
    const title = dialog.querySelector('#save-confirmation-title');
    const messageNode = dialog.querySelector('#save-confirmation-message');
    const icon = dialog.querySelector('.save-confirmation__icon');

    dialog.classList.toggle('has-warning', warning);
    if (title) title.textContent = warning ? 'Datos guardados con aviso' : 'Guardado correctamente';
    if (messageNode) messageNode.textContent = message;
    if (icon) icon.textContent = warning ? '!' : '✓';

    document.body.classList.add('has-modal');
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    window.setTimeout(() => dialog.querySelector('#save-confirmation-close')?.focus(), 50);
  };
})();
