// Fichas publicadas y conversación entre lectores.
(() => {
  const AVATARS = Array.isArray(window.BOOK_AFFINITY_AVATARS) ? window.BOOK_AFFINITY_AVATARS : [];
  const originalRenderBook = renderBook;

  function avatarOption(id) {
    return AVATARS.find(item => item.id === id) || null;
  }

  function ownerUsername() {
    return state.book?.owner_username || window.bookAffinityProfile?.username || 'lector';
  }

  function ownerAvatarId() {
    return state.book?.owner_avatar_id || window.bookAffinityProfile?.avatar_id || '';
  }

  function avatarNode(avatarId, username, className = 'comment-avatar') {
    const avatar = avatarOption(avatarId);
    if (avatar) {
      const image = document.createElement('img');
      image.className = className;
      image.src = avatar.src;
      image.alt = '';
      image.width = 46;
      image.height = 46;
      return image;
    }
    const fallback = document.createElement('span');
    fallback.className = `${className} comment-avatar--fallback`;
    fallback.textContent = String(username || 'L').charAt(0).toUpperCase();
    return fallback;
  }

  function ensureOwnerBanner() {
    let banner = document.querySelector('#published-owner-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'published-owner-banner';
    banner.className = 'published-owner-banner';
    const copy = document.createElement('div');
    copy.className = 'published-owner-banner__copy';
    const caption = document.createElement('small');
    caption.id = 'published-owner-caption';
    const name = document.createElement('strong');
    name.id = 'published-owner-name';
    copy.append(caption, name);
    banner.append(copy);
    elements.tags?.before(banner);
    return banner;
  }

  function renderOwnerBanner() {
    const banner = ensureOwnerBanner();
    banner.replaceChildren();
    banner.append(avatarNode(ownerAvatarId(), ownerUsername(), 'published-owner-banner__avatar'));
    const copy = document.createElement('div');
    copy.className = 'published-owner-banner__copy';
    const caption = document.createElement('small');
    caption.textContent = state.isOwner
      ? (state.book.is_public ? 'Publicado para tus seguidores' : 'Lectura privada')
      : 'Lectura compartida por';
    const name = document.createElement('strong');
    name.textContent = state.isOwner ? `@${ownerUsername()}` : `@${ownerUsername()}`;
    copy.append(caption, name);
    banner.append(copy);
    banner.classList.toggle('is-private', !state.book.is_public);
  }

  function ensureCommentsPanel() {
    let panel = document.querySelector('#comments-panel');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = 'comments-panel';
    panel.className = 'detail-panel comments-panel';
    panel.setAttribute('aria-labelledby', 'comments-title');
    panel.innerHTML = `
      <div class="comments-panel__heading">
        <div><p class="eyebrow eyebrow--dark">Conversación</p><h2 id="comments-title">Comentarios</h2></div>
        <span id="comments-count">0</span>
      </div>
      <p class="comments-panel__notice" id="comments-notice"></p>
      <form class="comment-form" id="comment-form">
        <label class="field" for="comment-body"><span>Escribir comentario</span><textarea id="comment-body" rows="3" maxlength="1000" placeholder="Comenta esta lectura…" required></textarea></label>
        <div class="comment-form__footer"><small><span id="comment-length">0</span>/1000</small><button class="button button--primary" type="submit">Publicar comentario</button></div>
        <p class="form-message" id="comment-message" aria-live="polite"></p>
      </form>
      <div class="comments-list" id="comments-list"></div>`;

    elements.editPanel?.before(panel);
    const form = panel.querySelector('#comment-form');
    const textarea = panel.querySelector('#comment-body');
    form?.addEventListener('submit', addComment);
    textarea?.addEventListener('input', () => {
      const length = panel.querySelector('#comment-length');
      if (length) length.textContent = String(textarea.value.length);
    });
    return panel;
  }

  function commentError(error) {
    const message = String(error?.message || error || '');
    const normalized = message.toLowerCase();
    if (normalized.includes('could not find the function') || normalized.includes('schema cache')) {
      return 'Falta ejecutar supabase/social.sql en Supabase.';
    }
    return message || 'No se pudo completar la operación.';
  }

  function commentCard(comment) {
    const article = document.createElement('article');
    article.className = 'comment-card';
    article.append(avatarNode(comment.avatar_id, comment.username));

    const content = document.createElement('div');
    content.className = 'comment-card__content';
    const head = document.createElement('div');
    head.className = 'comment-card__head';
    const identity = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = `@${comment.username}`;
    const date = document.createElement('small');
    date.textContent = formatDate(comment.created_at, true);
    identity.append(name, date);
    head.append(identity);

    if (comment.can_delete) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'comment-delete';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => deleteComment(comment.id));
      head.append(remove);
    }

    const body = document.createElement('p');
    body.textContent = comment.body;
    content.append(head, body);
    article.append(content);
    return article;
  }

  async function loadComments() {
    const panel = ensureCommentsPanel();
    const list = panel.querySelector('#comments-list');
    const count = panel.querySelector('#comments-count');
    const notice = panel.querySelector('#comments-notice');
    const form = panel.querySelector('#comment-form');

    panel.hidden = false;
    list.replaceChildren();
    count.textContent = '0';

    if (!state.book?.is_public) {
      notice.textContent = state.isOwner
        ? 'Este libro es privado. Publícalo para activar la conversación con tus seguidores.'
        : 'La conversación no está disponible.';
      form.hidden = true;
      list.append(Object.assign(document.createElement('p'), {
        className: 'comments-empty',
        textContent: 'Los comentarios solo están disponibles en libros publicados.'
      }));
      return;
    }

    notice.textContent = state.isOwner
      ? 'Tú y los lectores que te siguen podéis comentar esta publicación.'
      : `Estás comentando la lectura publicada por @${ownerUsername()}.`;
    form.hidden = false;
    list.append(Object.assign(document.createElement('p'), {
      className: 'comments-empty',
      textContent: 'Cargando comentarios…'
    }));

    const { data, error } = await supabaseClient.rpc('book_affinity_book_comments', { p_book_id: state.book.id });
    list.replaceChildren();
    if (error) {
      list.append(Object.assign(document.createElement('p'), {
        className: 'comments-empty is-error',
        textContent: commentError(error)
      }));
      return;
    }

    const comments = data || [];
    count.textContent = String(comments.length);
    if (!comments.length) {
      list.append(Object.assign(document.createElement('p'), {
        className: 'comments-empty',
        textContent: 'Todavía no hay comentarios. Puedes iniciar la conversación.'
      }));
      return;
    }
    list.append(...comments.map(commentCard));
  }

  async function addComment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const textarea = form.querySelector('#comment-body');
    const message = form.querySelector('#comment-message');
    const body = textarea.value.trim();
    if (!body) return;

    message.textContent = 'Publicando comentario…';
    message.className = 'form-message';
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    const { error } = await supabaseClient.rpc('book_affinity_add_comment', {
      p_book_id: state.book.id,
      p_body: body
    });

    button.disabled = false;
    if (error) {
      message.textContent = commentError(error);
      message.className = 'form-message is-error';
      return;
    }

    textarea.value = '';
    form.querySelector('#comment-length').textContent = '0';
    message.textContent = '';
    await loadComments();
  }

  async function deleteComment(commentId) {
    const accepted = window.confirm('¿Eliminar este comentario?');
    if (!accepted) return;
    const { error } = await supabaseClient.rpc('book_affinity_delete_comment', { p_comment_id: commentId });
    if (error) {
      showToast(commentError(error));
      return;
    }
    await loadComments();
  }

  renderBook = function (...args) {
    originalRenderBook.apply(this, args);
    state.isOwner = Boolean(state.user && state.book?.user_id === state.user.id);

    elements.editToggle.hidden = !state.isOwner;
    elements.deleteButton.hidden = !state.isOwner;
    elements.editPanel.hidden = true;
    elements.notesPanel.hidden = !state.isOwner;
    elements.historyPanel.hidden = !state.isOwner;

    const privacyTag = createTag(state.book.is_public ? '◉ Publicado' : '● Privado');
    privacyTag.classList.add('detail-privacy-tag', state.book.is_public ? 'is-public' : 'is-private');
    elements.tags.append(privacyTag);

    renderOwnerBanner();
    loadComments();
  };

  loadBook = async function () {
    if (!state.id) {
      renderNotFound('Falta el identificador del libro en la dirección.');
      return;
    }

    if (!configured) {
      state.book = demoBooks[state.id] || null;
      state.history = state.book
        ? [{ current_page: state.book.current_page, status: state.book.status, recorded_at: '2026-08-05T11:00:00Z' }]
        : [];
      state.isOwner = Boolean(state.book);
      if (!state.book) renderNotFound('Este identificador no existe en los datos de demostración.');
      else renderBook();
      return;
    }

    if (!state.user) {
      renderNotFound('Inicia sesión para abrir tu biblioteca o las lecturas publicadas por personas a las que sigues.');
      return;
    }

    const ownResult = await supabaseClient
      .from('books')
      .select('*')
      .eq('id', state.id)
      .maybeSingle();

    if (ownResult.data) {
      state.book = {
        ...ownResult.data,
        owner_username: window.bookAffinityProfile?.username || 'lector',
        owner_avatar_id: window.bookAffinityProfile?.avatar_id || ''
      };
      state.isOwner = true;
      const historyResult = await supabaseClient
        .from('reading_updates')
        .select('*')
        .eq('book_id', state.id)
        .order('recorded_at', { ascending: false })
        .limit(30);
      state.history = historyResult.data || [];
      renderBook();
      return;
    }

    const publicResult = await supabaseClient.rpc('book_affinity_public_book', { p_book_id: state.id });
    const publicBook = Array.isArray(publicResult.data) ? publicResult.data[0] : publicResult.data;
    if (publicResult.error || !publicBook) {
      console.error(publicResult.error || ownResult.error);
      renderNotFound(publicResult.error && String(publicResult.error.message || '').toLowerCase().includes('function')
        ? 'Falta ejecutar supabase/social.sql en Supabase.'
        : 'El libro no existe, es privado o no sigues a su propietario.');
      return;
    }

    state.book = publicBook;
    state.history = [];
    state.isOwner = false;
    renderBook();
  };
})();
