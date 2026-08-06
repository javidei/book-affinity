// Red de lectores: búsqueda, seguimiento y actividad publicada.
(() => {
  const AVATARS = Array.isArray(window.BOOK_AFFINITY_AVATARS) ? window.BOOK_AFFINITY_AVATARS : [];
  let lastSearch = '';

  function avatarOption(id) {
    return AVATARS.find(item => item.id === id) || null;
  }

  function avatarNode(avatarId, username, className = 'reader-avatar') {
    const avatar = avatarOption(avatarId);
    if (avatar) {
      const image = document.createElement('img');
      image.className = className;
      image.src = avatar.src;
      image.alt = '';
      image.width = 54;
      image.height = 54;
      return image;
    }

    const fallback = document.createElement('span');
    fallback.className = `${className} reader-avatar--fallback`;
    fallback.textContent = String(username || 'L').charAt(0).toUpperCase();
    return fallback;
  }

  function socialError(error) {
    const message = String(error?.message || error || '');
    const normalized = message.toLowerCase();
    if (normalized.includes('could not find the function') || normalized.includes('schema cache') || normalized.includes('book_affinity_')) {
      return 'Falta ejecutar supabase/social.sql en Supabase para activar la red de lectores.';
    }
    return message || 'No se pudo cargar la zona de lectores.';
  }

  function ensureSocialNav() {
    const nav = document.querySelector('#main-nav');
    if (!nav || nav.querySelector('[href="#lectores"]')) return;
    const link = document.createElement('a');
    link.href = '#lectores';
    link.textContent = 'Lectores';
    const addButton = nav.querySelector('#open-book-form');
    nav.insertBefore(link, addButton || null);
  }

  function ensureSocialSection() {
    let section = document.querySelector('#lectores');
    if (section) return section;

    section = document.createElement('section');
    section.id = 'lectores';
    section.className = 'social-section';
    section.setAttribute('aria-labelledby', 'social-title');
    section.innerHTML = `
      <div class="shell">
        <div class="section-heading section-heading--light social-heading">
          <div>
            <p class="eyebrow">Comunidad privada</p>
            <h2 id="social-title">Lectores que conoces</h2>
          </div>
          <p>Sigue a tus amigos mediante su usuario y descubre únicamente los libros que hayan decidido publicar.</p>
        </div>

        <div class="social-locked" id="social-locked" hidden>
          <strong>Inicia sesión para conectar con otros lectores.</strong>
          <p>La búsqueda, los seguimientos y los comentarios están disponibles solo para cuentas identificadas.</p>
        </div>

        <div class="social-content" id="social-content">
          <article class="social-panel social-search-panel">
            <p class="eyebrow eyebrow--dark">Añadir lector</p>
            <h3>Buscar por usuario</h3>
            <form class="reader-search-form" id="reader-search-form">
              <label class="field" for="reader-search-input">
                <span>Nombre de usuario</span>
                <div class="reader-search-input"><span aria-hidden="true">@</span><input id="reader-search-input" type="text" minlength="3" maxlength="24" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="usuario" required></div>
              </label>
              <button class="button button--primary" type="submit">Buscar lector</button>
            </form>
            <p class="social-message" id="reader-search-message" aria-live="polite"></p>
            <div id="reader-search-result"></div>
          </article>

          <div class="social-relations-grid">
            <article class="social-panel">
              <div class="social-panel__heading"><div><p class="eyebrow eyebrow--dark">Tu círculo</p><h3>Siguiendo</h3></div><span id="following-count">0</span></div>
              <div class="reader-list" id="following-list"></div>
            </article>
            <article class="social-panel">
              <div class="social-panel__heading"><div><p class="eyebrow eyebrow--dark">Tu comunidad</p><h3>Te siguen</h3></div><span id="followers-count">0</span></div>
              <div class="reader-list" id="followers-list"></div>
            </article>
          </div>

          <article class="social-panel social-feed-panel">
            <div class="social-panel__heading"><div><p class="eyebrow eyebrow--dark">Actividad publicada</p><h3>Están leyendo</h3></div><span id="social-feed-count">0</span></div>
            <p class="social-feed-intro">Aquí solo aparecen lecturas marcadas como públicas por personas a las que sigues.</p>
            <div class="social-feed" id="social-feed"></div>
          </article>
        </div>
      </div>`;

    const searchSection = document.querySelector('.search-section');
    if (searchSection) searchSection.before(section);
    else document.querySelector('main')?.append(section);

    section.querySelector('#reader-search-form')?.addEventListener('submit', searchReader);
    return section;
  }

  function setSearchMessage(message, error = false) {
    const node = document.querySelector('#reader-search-message');
    if (!node) return;
    node.textContent = message;
    node.className = `social-message${error ? ' is-error' : ''}`;
  }

  function actionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function readerIdentity(reader, compact = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `reader-identity${compact ? ' reader-identity--compact' : ''}`;
    wrapper.append(avatarNode(reader.avatar_id, reader.username));

    const copy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = `@${reader.username}`;
    const meta = document.createElement('small');
    copy.append(name, meta);
    wrapper.append(copy);
    return { wrapper, meta };
  }

  function renderSearchResult(reader) {
    const container = document.querySelector('#reader-search-result');
    if (!container) return;
    container.replaceChildren();
    if (!reader) return;

    const card = document.createElement('div');
    card.className = 'reader-search-result';
    const identity = readerIdentity(reader);
    identity.meta.textContent = `${reader.followers_count || 0} seguidores · ${reader.published_reading_count || 0} lecturas públicas en curso`;
    card.append(identity.wrapper);

    if (reader.is_me) {
      const badge = document.createElement('span');
      badge.className = 'reader-state-badge';
      badge.textContent = 'Esta es tu cuenta';
      card.append(badge);
    } else if (reader.is_following) {
      card.append(actionButton('Dejar de seguir', 'button button--secondary', () => unfollowReader(reader.user_id, reader.username)));
    } else {
      card.append(actionButton('Seguir lector', 'button button--primary', () => followReader(reader.username)));
    }

    container.append(card);
  }

  async function searchReader(event) {
    event.preventDefault();
    if (!state?.user) return;
    const input = document.querySelector('#reader-search-input');
    const username = String(input?.value || '').trim().replace(/^@/, '').toLowerCase();
    lastSearch = username;
    document.querySelector('#reader-search-result')?.replaceChildren();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setSearchMessage('Escribe entre 3 y 24 letras, números o guiones bajos.', true);
      return;
    }

    setSearchMessage('Buscando lector…');
    const { data, error } = await supabaseClient.rpc('book_affinity_find_reader', { p_username: username });
    if (error) {
      setSearchMessage(socialError(error), true);
      return;
    }
    if (!data) {
      setSearchMessage(`No existe ningún lector llamado @${username}.`, true);
      return;
    }

    setSearchMessage('Lector encontrado.');
    renderSearchResult(data);
  }

  async function followReader(username) {
    window.setAppBusy?.(true, 'Añadiendo lector…', `Estamos conectando con @${username}.`);
    try {
      const { data, error } = await supabaseClient.rpc('book_affinity_follow_reader', { p_username: username });
      if (error) throw error;
      renderSearchResult(data);
      await loadSocialReaders();
      window.showConfirmationPopup?.({
        eyebrow: 'Lector añadido',
        title: `@${username}`,
        message: 'Ya podrás ver aquí los libros que esta persona decida publicar.',
        icon: '✓',
        variant: 'success',
        buttonLabel: 'Continuar'
      });
    } catch (error) {
      setSearchMessage(socialError(error), true);
    } finally {
      window.setAppBusy?.(false);
    }
  }

  async function unfollowReader(userId, username) {
    window.setAppBusy?.(true, 'Actualizando lectores…', `Dejando de seguir a @${username}.`);
    try {
      const { error } = await supabaseClient.rpc('book_affinity_unfollow_reader', { p_user_id: userId });
      if (error) throw error;
      await loadSocialReaders();
      if (lastSearch === username) {
        const { data } = await supabaseClient.rpc('book_affinity_find_reader', { p_username: username });
        renderSearchResult(data);
      }
    } catch (error) {
      setSearchMessage(socialError(error), true);
    } finally {
      window.setAppBusy?.(false);
    }
  }

  function emptyMessage(text) {
    const paragraph = document.createElement('p');
    paragraph.className = 'social-empty';
    paragraph.textContent = text;
    return paragraph;
  }

  function renderFollowing(readers) {
    const list = document.querySelector('#following-list');
    const count = document.querySelector('#following-count');
    if (!list || !count) return;
    count.textContent = String(readers.length);
    list.replaceChildren();
    if (!readers.length) {
      list.append(emptyMessage('Todavía no sigues a ningún lector. Busca a un amigo por su usuario.'));
      return;
    }

    readers.forEach(reader => {
      const row = document.createElement('div');
      row.className = 'reader-row';
      const identity = readerIdentity(reader, true);
      identity.meta.textContent = reader.published_reading_count
        ? `${reader.published_reading_count} leyendo públicamente`
        : 'Sin lecturas públicas ahora';
      row.append(identity.wrapper, actionButton('Dejar de seguir', 'reader-row__action', () => unfollowReader(reader.user_id, reader.username)));
      list.append(row);
    });
  }

  function renderFollowers(readers) {
    const list = document.querySelector('#followers-list');
    const count = document.querySelector('#followers-count');
    if (!list || !count) return;
    count.textContent = String(readers.length);
    list.replaceChildren();
    if (!readers.length) {
      list.append(emptyMessage('Aún no tienes seguidores. Comparte tu nombre de usuario con tus amigos.'));
      return;
    }

    readers.forEach(reader => {
      const row = document.createElement('div');
      row.className = 'reader-row';
      const identity = readerIdentity(reader, true);
      identity.meta.textContent = reader.is_following_back ? 'Os seguís mutuamente' : 'Te sigue';
      row.append(identity.wrapper);
      if (!reader.is_following_back) {
        row.append(actionButton('Seguir también', 'reader-row__action reader-row__action--primary', () => followReader(reader.username)));
      }
      list.append(row);
    });
  }

  function feedCard(book) {
    const article = document.createElement('article');
    article.className = 'social-book-card';

    const owner = document.createElement('div');
    owner.className = 'social-book-card__owner';
    owner.append(avatarNode(book.owner_avatar_id, book.owner_username, 'reader-avatar reader-avatar--small'));
    const ownerCopy = document.createElement('div');
    const ownerName = document.createElement('strong');
    ownerName.textContent = `@${book.owner_username}`;
    const activity = document.createElement('small');
    activity.textContent = 'está leyendo';
    ownerCopy.append(ownerName, activity);
    owner.append(ownerCopy);

    const link = document.createElement('a');
    link.className = 'social-book-card__book';
    link.href = `book.html?id=${encodeURIComponent(book.id)}`;
    const image = document.createElement('img');
    image.src = safeImageUrl(book.cover_url || book.thumbnail_url);
    image.alt = `Portada de ${book.title}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => { image.src = 'assets/book-placeholder.svg'; }, { once: true });
    const copy = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = book.title;
    const author = document.createElement('p');
    author.textContent = formatAuthors(book.authors);
    const progressLine = document.createElement('div');
    progressLine.className = 'social-book-card__progress-line';
    const pages = document.createElement('span');
    pages.textContent = book.page_count ? `Página ${book.current_page || 0} de ${book.page_count}` : `Página ${book.current_page || 0}`;
    const percentage = document.createElement('strong');
    percentage.textContent = `${Math.round(Number(book.progress_percent) || 0)}%`;
    progressLine.append(pages, percentage);
    const track = document.createElement('div');
    track.className = 'progress-track';
    const fill = document.createElement('span');
    fill.style.width = `${Math.round(Number(book.progress_percent) || 0)}%`;
    track.append(fill);
    const comments = document.createElement('small');
    comments.className = 'social-book-card__comments';
    comments.textContent = `${book.comments_count || 0} comentarios · Abrir conversación →`;
    copy.append(title, author, progressLine, track, comments);
    link.append(image, copy);
    article.append(owner, link);
    return article;
  }

  function renderFeed(books) {
    const feed = document.querySelector('#social-feed');
    const count = document.querySelector('#social-feed-count');
    if (!feed || !count) return;
    count.textContent = String(books.length);
    feed.replaceChildren();
    if (!books.length) {
      feed.append(emptyMessage('No hay lecturas públicas en curso entre las personas que sigues.'));
      return;
    }
    feed.append(...books.map(feedCard));
  }

  window.loadSocialReaders = async () => {
    ensureSocialNav();
    ensureSocialSection();
    const locked = document.querySelector('#social-locked');
    const content = document.querySelector('#social-content');

    if (!configured || !state?.user) {
      if (locked) locked.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    if (locked) locked.hidden = true;
    if (content) content.hidden = false;

    const [followingResult, followersResult, feedResult] = await Promise.all([
      supabaseClient.rpc('book_affinity_list_following'),
      supabaseClient.rpc('book_affinity_list_followers'),
      supabaseClient.rpc('book_affinity_social_feed')
    ]);

    const error = followingResult.error || followersResult.error || feedResult.error;
    if (error) {
      setSearchMessage(socialError(error), true);
      renderFollowing([]);
      renderFollowers([]);
      renderFeed([]);
      return;
    }

    renderFollowing(followingResult.data || []);
    renderFollowers(followersResult.data || []);
    renderFeed(feedResult.data || []);
  };

  ensureSocialNav();
  ensureSocialSection();

  if (typeof loadLibrary === 'function' && !window.__bookAffinitySocialLibraryPatch) {
    window.__bookAffinitySocialLibraryPatch = true;
    const originalLoadLibrary = loadLibrary;
    loadLibrary = async function (...args) {
      const result = await originalLoadLibrary.apply(this, args);
      await window.loadSocialReaders?.();
      return result;
    };
  }
})();
