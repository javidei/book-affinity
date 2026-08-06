// Controles de publicación libro a libro.
(() => {
  function privacyControl(id, title, description) {
    const wrapper = document.createElement('label');
    wrapper.className = 'book-privacy-control field--wide';
    wrapper.htmlFor = id;

    const input = document.createElement('input');
    input.id = id;
    input.type = 'checkbox';

    const visual = document.createElement('span');
    visual.className = 'book-privacy-control__visual';
    visual.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    copy.className = 'book-privacy-control__copy';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = description;
    copy.append(strong, small);

    wrapper.append(input, visual, copy);
    return wrapper;
  }

  function ensureBookFormPrivacy() {
    const grid = document.querySelector('#book-form .form-grid');
    if (!grid || document.querySelector('#book-is-public')) return;
    grid.append(privacyControl(
      'book-is-public',
      'Publicar para mis seguidores',
      'Tus seguidores podrán ver esta lectura y comentar. Tus notas personales nunca se comparten.'
    ));
  }

  function ensureDetailFormPrivacy() {
    const form = document.querySelector('#detail-form');
    const message = document.querySelector('#detail-form-message');
    if (!form || !message || document.querySelector('#edit-is-public')) return;
    form.insertBefore(privacyControl(
      'edit-is-public',
      'Publicar para mis seguidores',
      'Puedes retirarlo cuando quieras. Al hacerlo, los comentarios quedan ocultos hasta que vuelvas a publicarlo.'
    ), message);
  }

  function addVisibilityBadge(card, book) {
    const cover = card?.querySelector('.book-cover');
    if (!cover || cover.querySelector('.visibility-pill')) return card;
    const badge = document.createElement('span');
    badge.className = `visibility-pill ${book.is_public ? 'is-public' : 'is-private'}`;
    badge.textContent = book.is_public ? '◉ Publicado' : '● Privado';
    badge.title = book.is_public
      ? 'Visible para los lectores que te siguen'
      : 'Solo tú puedes ver este libro';
    cover.append(badge);
    return card;
  }

  ensureBookFormPrivacy();
  ensureDetailFormPrivacy();

  if (typeof resetBookForm === 'function') {
    const originalResetBookForm = resetBookForm;
    resetBookForm = function (...args) {
      const result = originalResetBookForm.apply(this, args);
      const input = document.querySelector('#book-is-public');
      if (input) input.checked = false;
      return result;
    };
  }

  if (typeof openBookForm === 'function') {
    const originalOpenBookForm = openBookForm;
    openBookForm = function (book = null) {
      const result = originalOpenBookForm.call(this, book);
      const input = document.querySelector('#book-is-public');
      if (input) input.checked = Boolean(book?.is_public);
      return result;
    };
  }

  if (typeof formPayload === 'function') {
    const originalFormPayload = formPayload;
    formPayload = function (...args) {
      return {
        ...originalFormPayload.apply(this, args),
        is_public: Boolean(document.querySelector('#book-is-public')?.checked)
      };
    };
  }

  if (typeof fillEditForm === 'function') {
    const originalFillEditForm = fillEditForm;
    fillEditForm = function (...args) {
      const result = originalFillEditForm.apply(this, args);
      const input = document.querySelector('#edit-is-public');
      if (input) input.checked = Boolean(state?.book?.is_public);
      return result;
    };
  }

  if (typeof payloadFromForm === 'function') {
    const originalPayloadFromForm = payloadFromForm;
    payloadFromForm = function (...args) {
      return {
        ...originalPayloadFromForm.apply(this, args),
        is_public: Boolean(document.querySelector('#edit-is-public')?.checked)
      };
    };
  }

  if (typeof createBookCard === 'function') {
    const originalCreateBookCard = createBookCard;
    createBookCard = function (book) {
      return addVisibilityBadge(originalCreateBookCard.call(this, book), book);
    };
  }
})();
