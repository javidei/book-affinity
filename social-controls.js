// Ajustes de interacción de la red de lectores.
(() => {
  function closeDialogSafely(dialog) {
    if (!dialog) return;
    if (typeof closeDialog === 'function') closeDialog(dialog);
    else if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function ensureUnfollowDialog() {
    let dialog = document.querySelector('#unfollow-confirm-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'unfollow-confirm-dialog';
    dialog.className = 'modal social-unfollow-dialog';
    dialog.setAttribute('aria-labelledby', 'unfollow-confirm-title');
    dialog.innerHTML = `
      <div class="dialog-card dialog-card--confirmation social-unfollow-confirmation">
        <div class="social-unfollow-confirmation__icon" aria-hidden="true">−</div>
        <p class="eyebrow eyebrow--dark">Actualizar lectores</p>
        <h2 id="unfollow-confirm-title">¿Dejar de seguir?</h2>
        <p>Dejarás de ver los libros que esta persona publique. Podrás volver a seguirla más adelante.</p>
        <strong id="unfollow-confirm-user">@lector</strong>
        <div class="dialog-actions dialog-actions--center social-unfollow-confirmation__actions">
          <button class="button button--secondary" id="unfollow-cancel" type="button">Cancelar</button>
          <button class="button button--danger" id="unfollow-confirm" type="button">Sí, dejar de seguir</button>
        </div>
      </div>`;

    dialog.querySelector('#unfollow-cancel')?.addEventListener('click', () => closeDialogSafely(dialog));
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialogSafely(dialog);
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialogSafely(dialog);
    });
    dialog.addEventListener('close', () => document.body.classList.remove('has-modal'));
    dialog.querySelector('#unfollow-confirm')?.addEventListener('click', confirmUnfollow);
    document.body.append(dialog);
    return dialog;
  }

  function readerUsernameFromButton(button) {
    const scope = button.closest('.reader-row, .reader-search-result');
    const value = scope?.querySelector('.reader-identity strong')?.textContent || '';
    return value.trim().replace(/^@/, '').toLowerCase();
  }

  function openUnfollowConfirmation(username) {
    if (!username) return;
    const dialog = ensureUnfollowDialog();
    dialog.dataset.username = username;
    const identity = dialog.querySelector('#unfollow-confirm-user');
    if (identity) identity.textContent = `@${username}`;
    if (typeof showDialog === 'function') showDialog(dialog);
    else dialog.showModal?.();
    window.setTimeout(() => dialog.querySelector('#unfollow-cancel')?.focus(), 40);
  }

  async function confirmUnfollow(event) {
    const button = event.currentTarget;
    const dialog = button.closest('dialog');
    const username = String(dialog?.dataset.username || '');
    if (!username || !state?.user) return;

    button.disabled = true;
    dialog.querySelector('#unfollow-cancel')?.setAttribute('disabled', '');
    closeDialogSafely(dialog);
    window.setAppBusy?.(true, 'Actualizando lectores…', `Dejando de seguir a @${username}.`);

    try {
      const readerResult = await supabaseClient.rpc('book_affinity_find_reader', { p_username: username });
      if (readerResult.error) throw readerResult.error;
      if (!readerResult.data?.user_id) throw new Error('No se ha encontrado ese lector.');

      const { error } = await supabaseClient.rpc('book_affinity_unfollow_reader', {
        p_user_id: readerResult.data.user_id
      });
      if (error) throw error;

      document.querySelector('#reader-search-result')?.replaceChildren();
      const searchMessage = document.querySelector('#reader-search-message');
      if (searchMessage) {
        searchMessage.textContent = `Ya no sigues a @${username}.`;
        searchMessage.className = 'social-message';
      }
      await window.loadSocialReaders?.();
      window.showConfirmationPopup?.({
        eyebrow: 'Seguimiento actualizado',
        title: `@${username}`,
        message: 'Has dejado de seguir a este lector. Sus publicaciones ya no aparecerán en tu actividad.',
        icon: '✓',
        variant: 'neutral',
        buttonLabel: 'Aceptar'
      });
    } catch (error) {
      const searchMessage = document.querySelector('#reader-search-message');
      if (searchMessage) {
        searchMessage.textContent = error?.message || 'No se pudo dejar de seguir a este lector.';
        searchMessage.className = 'social-message is-error';
      }
    } finally {
      window.setAppBusy?.(false);
      button.disabled = false;
      dialog?.querySelector('#unfollow-cancel')?.removeAttribute('disabled');
    }
  }

  function updateSocialWording() {
    const section = document.querySelector('#lectores');
    if (!section) return;

    const feedTitle = section.querySelector('.social-feed-panel h3');
    const feedIntro = section.querySelector('.social-feed-intro');
    if (feedTitle) feedTitle.textContent = 'Libros publicados';
    if (feedIntro) feedIntro.textContent = 'Aquí aparecen todos los libros que las personas a las que sigues hayan decidido publicar.';

    section.querySelectorAll('.social-book-card__owner small').forEach(node => {
      node.textContent = 'ha compartido un libro';
    });

    section.querySelectorAll('.reader-identity small').forEach(node => {
      node.textContent = node.textContent
        .replace(/lecturas públicas en curso/g, 'libros publicados')
        .replace(/leyendo públicamente/g, 'libros publicados')
        .replace(/Sin lecturas públicas ahora/g, 'Sin libros publicados');
    });

    section.querySelectorAll('.social-empty').forEach(node => {
      if (node.textContent.includes('lecturas públicas en curso')) {
        node.textContent = 'No hay libros publicados entre las personas que sigues.';
      }
    });
  }

  const originalLoadSocialReaders = window.loadSocialReaders;
  if (typeof originalLoadSocialReaders === 'function') {
    window.loadSocialReaders = async (...args) => {
      window.updateSessionVisibility?.();
      if (!state?.user) return;
      const result = await originalLoadSocialReaders(...args);
      updateSocialWording();
      window.updateSessionVisibility?.();
      return result;
    };
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !button.closest('#lectores')) return;
    if (button.textContent.trim() !== 'Dejar de seguir') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openUnfollowConfirmation(readerUsernameFromButton(button));
  }, true);

  updateSocialWording();
  window.updateSessionVisibility?.();
})();
