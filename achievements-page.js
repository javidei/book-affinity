// Página independiente de logros de Book Affinity.
(() => {
  const config = window.BOOK_AFFINITY_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase?.createClient);
  const supabaseClient = configured
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
    : null;

  const DEFINITIONS = Object.freeze([
    { id: 'first-book', title: 'Primera página', description: 'Añade tu primer libro a la biblioteca.', metric: 'books_total', target: 1, icon: 'book', accent: '#d79a4d' },
    { id: 'first-follower', title: 'Alguien te lee', description: 'Consigue tu primer seguidor.', metric: 'followers_count', target: 1, icon: 'followers', accent: '#7d5d95' },
    { id: 'first-following', title: 'Club de lectura', description: 'Sigue a tu primer amigo lector.', metric: 'following_count', target: 1, icon: 'compass', accent: '#3f6b5a' },
    { id: 'first-finished', title: 'Final feliz', description: 'Termina tu primer libro.', metric: 'books_finished', target: 1, icon: 'trophy', accent: '#be765f' },
    { id: 'trilogy', title: 'Trilogía completa', description: 'Termina tres libros.', metric: 'books_finished', target: 3, icon: 'stack', accent: '#536fa1' },
    { id: 'first-public', title: 'Libro abierto', description: 'Publica una lectura para tus seguidores.', metric: 'books_public', target: 1, icon: 'broadcast', accent: '#3f8067' },
    { id: 'first-comment', title: 'Romper el hielo', description: 'Escribe tu primer comentario.', metric: 'comments_written', target: 1, icon: 'comment', accent: '#a85879' },
    { id: 'first-reply', title: 'Conversación iniciada', description: 'Recibe un comentario en uno de tus libros.', metric: 'comments_received', target: 1, icon: 'chat-heart', accent: '#8c5a9e' },
    { id: 'library-five', title: 'Estantería propia', description: 'Guarda cinco libros.', metric: 'books_total', target: 5, icon: 'shelf', accent: '#a66f3d' },
    { id: 'pages-thousand', title: 'Mil páginas', description: 'Registra 1.000 páginas de progreso.', metric: 'pages_total', target: 1000, icon: 'pages', accent: '#496f87' },
    { id: 'library-ten', title: 'Biblioteca creciente', description: 'Guarda diez libros.', metric: 'books_total', target: 10, icon: 'library', accent: '#bd7b43', secret: true },
    { id: 'library-twenty-five', title: 'Coleccionista', description: 'Alcanza veinticinco libros.', metric: 'books_total', target: 25, icon: 'crown', accent: '#c08b33', secret: true },
    { id: 'finished-five', title: 'Racha lectora', description: 'Termina cinco libros.', metric: 'books_finished', target: 5, icon: 'medal', accent: '#bf6d58', secret: true },
    { id: 'finished-ten', title: 'Diez finales', description: 'Termina diez libros.', metric: 'books_finished', target: 10, icon: 'laurel', accent: '#8864a0', secret: true },
    { id: 'followers-five', title: 'Pequeño club', description: 'Consigue cinco seguidores.', metric: 'followers_count', target: 5, icon: 'group', accent: '#6553a4', secret: true },
    { id: 'followers-ten', title: 'Lector influyente', description: 'Consigue diez seguidores.', metric: 'followers_count', target: 10, icon: 'star-person', accent: '#b56b8d', secret: true },
    { id: 'following-five', title: 'Explorador literario', description: 'Sigue a cinco lectores.', metric: 'following_count', target: 5, icon: 'map', accent: '#3f7d70', secret: true },
    { id: 'comments-ten', title: 'Comentarista', description: 'Escribe diez comentarios.', metric: 'comments_written', target: 10, icon: 'quill', accent: '#9b657e', secret: true },
    { id: 'replies-ten', title: 'Libro debatido', description: 'Recibe diez comentarios.', metric: 'comments_received', target: 10, icon: 'conversation', accent: '#6c5d9b', secret: true },
    { id: 'public-ten', title: 'Estantería pública', description: 'Publica diez libros.', metric: 'books_public', target: 10, icon: 'spotlight', accent: '#3e7861', secret: true }
  ]);

  const elements = {
    menuToggle: document.querySelector('#achievements-menu-toggle'),
    nav: document.querySelector('#achievements-nav'),
    themeToggle: document.querySelector('#achievements-theme-toggle'),
    accountLink: document.querySelector('#achievements-account-link'),
    accountAvatar: document.querySelector('#achievements-account-avatar'),
    accountCaption: document.querySelector('#achievements-account-caption'),
    accountName: document.querySelector('#achievements-account-name'),
    libraryLink: document.querySelector('#achievements-library-link'),
    readersLink: document.querySelector('#achievements-readers-link'),
    loginRequired: document.querySelector('#achievements-login-required'),
    content: document.querySelector('#achievements-content'),
    grid: document.querySelector('#achievements-grid'),
    message: document.querySelector('#achievements-message'),
    count: document.querySelector('#achievements-unlocked-count'),
    year: document.querySelector('#year'),
    version: document.querySelector('#web-version')
  };

  const numberFormatter = new Intl.NumberFormat('es-ES');

  function iconSvg(name) {
    const icons = {
      book: '<path d="M10 14c7-4 14-4 22 1v35c-8-5-15-5-22-1V14Zm44 0c-7-4-14-4-22 1v35c8-5 15-5 22-1V14Z"/><path d="M32 15v35M17 24h9M38 24h9"/>',
      followers: '<circle cx="24" cy="23" r="8"/><circle cx="43" cy="27" r="6"/><path d="M10 51c1-11 7-16 14-16s13 5 14 16M36 49c1-8 5-12 11-12 5 0 9 4 10 12"/>',
      compass: '<circle cx="32" cy="32" r="23"/><path d="m41 22-6 14-14 6 6-14 14-6Z"/><circle cx="32" cy="32" r="2"/>',
      trophy: '<path d="M20 12h24v13c0 10-5 16-12 16s-12-6-12-16V12Z"/><path d="M20 18H10c0 9 4 14 12 15M44 18h10c0 9-4 14-12 15M32 41v9M23 54h18"/>',
      stack: '<path d="m12 18 20-8 20 8-20 8-20-8Zm0 13 20 8 20-8M12 43l20 8 20-8"/>',
      broadcast: '<path d="M17 42c-7-7-7-19 0-26M47 42c7-7 7-19 0-26M23 36c-4-4-4-10 0-14M41 36c4-4 4-10 0-14"/><circle cx="32" cy="29" r="6"/><path d="M32 35v17"/>',
      comment: '<path d="M10 13h44v31H29L17 53v-9h-7V13Z"/><path d="M20 24h24M20 33h16"/>',
      'chat-heart': '<path d="M9 14h46v31H35L23 53v-8H9V14Z"/><path d="M32 37s-10-5-10-12c0-5 6-7 10-2 4-5 10-3 10 2 0 7-10 12-10 12Z"/>',
      shelf: '<path d="M10 49h44M15 15h9v30h-9V15Zm13 5h9v25h-9V20Zm13-8h9v33h-9V12Z"/>',
      pages: '<path d="M15 10h28l8 8v36H15V10Z"/><path d="M43 10v10h10M23 29h20M23 38h20M23 47h12"/>',
      library: '<path d="M9 51h46M13 15h8v32h-8V15Zm12 6h8v26h-8V21Zm12-10h8v36h-8V11Zm12 7h8v29h-8V18Z"/>',
      crown: '<path d="m10 22 11 8 11-17 11 17 11-8-5 27H15l-5-27Z"/><path d="M16 54h32"/>',
      medal: '<circle cx="32" cy="38" r="14"/><path d="m21 8 11 16L43 8M25 40l5 5 9-10"/>',
      laurel: '<circle cx="32" cy="32" r="12"/><path d="M18 50C8 41 8 23 18 14M46 50c10-9 10-27 0-36M13 39l-6-2M15 28l-7-4M18 19l-5-6M51 39l6-2M49 28l7-4M46 19l5-6"/>',
      group: '<circle cx="32" cy="20" r="7"/><circle cx="15" cy="27" r="5"/><circle cx="49" cy="27" r="5"/><path d="M20 51c1-12 6-18 12-18s11 6 12 18M5 49c1-9 5-13 10-13M59 49c-1-9-5-13-10-13"/>',
      'star-person': '<circle cx="25" cy="25" r="8"/><path d="M10 52c1-12 7-18 15-18s14 6 15 18M48 10l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z"/>',
      map: '<path d="m8 16 15-6 18 6 15-6v38l-15 6-18-6-15 6V16Z"/><path d="M23 10v38M41 16v38"/><path d="m29 31 5-9 5 9-5 9-5-9Z"/>',
      quill: '<path d="M52 10C34 10 18 23 14 49c13-4 28-16 38-39Z"/><path d="M12 53c10-12 21-22 35-31M23 42l-8-7M32 33l-7-8"/>',
      conversation: '<path d="M8 13h35v25H25l-10 8v-8H8V13Z"/><path d="M31 27h25v20h-7v7l-9-7h-9V27ZM17 23h18M17 30h10"/>',
      spotlight: '<path d="M20 42h24l5 12H15l5-12Z"/><path d="M25 42V26h14v16M32 8v10M14 15l7 7M50 15l-7 7M9 31h10M45 31h10"/><circle cx="32" cy="24" r="5"/>'
    };
    return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.book}</g></svg>`;
  }

  function setupTheme() {
    const storageKey = 'book-affinity-theme';
    let theme = 'light';
    try {
      theme = localStorage.getItem(storageKey) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (_) {
      theme = 'light';
    }

    const apply = value => {
      document.documentElement.dataset.theme = value;
      const icon = elements.themeToggle?.querySelector('span');
      if (icon) icon.textContent = value === 'dark' ? '☀️' : '🌙';
      if (elements.themeToggle) elements.themeToggle.title = value === 'dark' ? 'Activar modo día' : 'Activar modo noche';
    };

    apply(theme);
    elements.themeToggle?.addEventListener('click', () => {
      theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, theme); } catch (_) { /* sin almacenamiento */ }
      apply(theme);
    });
  }

  function setupMenu() {
    elements.menuToggle?.addEventListener('click', () => {
      const open = elements.nav?.classList.toggle('is-open');
      elements.menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
    });
    elements.nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      elements.nav.classList.remove('is-open');
      elements.menuToggle?.setAttribute('aria-expanded', 'false');
    }));
  }

  function metricValue(stats, definition) {
    return Math.max(0, Number(stats?.[definition.metric]) || 0);
  }

  function isUnlocked(stats, definition) {
    return metricValue(stats, definition) >= definition.target;
  }

  function achievementCard(stats, definition) {
    const unlocked = isUnlocked(stats, definition);
    const current = metricValue(stats, definition);
    const percent = Math.min(100, Math.round((current / definition.target) * 100));
    const article = document.createElement('article');
    article.className = `achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}${definition.secret ? ' is-secret' : ''}`;
    article.style.setProperty('--achievement-accent', definition.accent);

    const icon = document.createElement('div');
    icon.className = 'achievement-card__icon';
    icon.innerHTML = iconSvg(definition.icon);

    const copy = document.createElement('div');
    copy.className = 'achievement-card__copy';
    const stateLabel = document.createElement('span');
    stateLabel.className = 'achievement-card__state';
    stateLabel.textContent = unlocked ? (definition.secret ? 'Logro secreto descubierto' : 'Desbloqueado') : 'Bloqueado';
    const title = document.createElement('h3');
    title.textContent = definition.title;
    const description = document.createElement('p');
    description.textContent = definition.description;

    const progress = document.createElement('div');
    progress.className = 'achievement-card__progress';
    const progressText = document.createElement('div');
    const currentText = document.createElement('span');
    currentText.textContent = unlocked ? 'Completado' : `${numberFormatter.format(Math.min(current, definition.target))} / ${numberFormatter.format(definition.target)}`;
    const percentText = document.createElement('strong');
    percentText.textContent = `${percent}%`;
    progressText.append(currentText, percentText);
    const track = document.createElement('div');
    track.className = 'achievement-card__track';
    const fill = document.createElement('span');
    fill.style.width = `${percent}%`;
    track.append(fill);
    progress.append(progressText, track);

    copy.append(stateLabel, title, description, progress);
    article.append(icon, copy);
    return article;
  }

  function renderStats(stats) {
    const visible = DEFINITIONS.filter(definition => !definition.secret || isUnlocked(stats, definition));
    const unlockedCount = DEFINITIONS.filter(definition => isUnlocked(stats, definition)).length;
    elements.grid.replaceChildren(...visible.map(definition => achievementCard(stats, definition)));
    elements.count.textContent = String(unlockedCount);
    elements.message.className = 'achievements-message';
    elements.message.textContent = `${unlockedCount} de ${DEFINITIONS.length} logros completados.`;
  }

  function avatarOption(id) {
    return (window.BOOK_AFFINITY_AVATARS || []).find(option => option.id === id) || null;
  }

  async function renderAccount(user) {
    const authenticated = Boolean(user);
    elements.libraryLink.hidden = !authenticated;
    elements.readersLink.hidden = !authenticated;
    elements.loginRequired.hidden = authenticated;
    elements.content.hidden = !authenticated;

    if (!authenticated) {
      elements.accountCaption.textContent = 'Cuenta';
      elements.accountName.textContent = 'Entrar';
      elements.accountAvatar.replaceChildren('?');
      elements.accountAvatar.className = 'account-header-button__avatar account-header-button__avatar--fallback';
      return;
    }

    let profile = null;
    try {
      const result = await supabaseClient
        .from('book_affinity_profiles')
        .select('username, avatar_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!result.error) profile = result.data;
    } catch (_) {
      profile = null;
    }

    const username = profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'lector';
    const avatarId = profile?.avatar_id || user.user_metadata?.avatar_id || '';
    const avatar = avatarOption(avatarId);
    elements.accountCaption.textContent = 'Mi cuenta';
    elements.accountName.textContent = `@${username}`;
    elements.accountAvatar.replaceChildren();

    if (avatar) {
      const image = document.createElement('img');
      image.src = avatar.src;
      image.alt = '';
      image.width = 38;
      image.height = 38;
      elements.accountAvatar.className = 'account-header-button__avatar';
      elements.accountAvatar.append(image);
    } else {
      elements.accountAvatar.className = 'account-header-button__avatar account-header-button__avatar--fallback';
      elements.accountAvatar.textContent = username.charAt(0).toUpperCase();
    }
  }

  function showLoadError(error) {
    const normalized = String(error?.message || error || '').toLowerCase();
    elements.message.className = 'achievements-message is-error';
    elements.message.textContent = normalized.includes('could not find the function') || normalized.includes('schema cache')
      ? 'Falta ejecutar supabase/achievements.sql en Supabase para activar los logros.'
      : `No se pudieron cargar los logros: ${error?.message || error}`;
  }

  async function loadForUser(user) {
    await renderAccount(user);
    if (!user || !supabaseClient) return;
    elements.message.className = 'achievements-message';
    elements.message.textContent = 'Calculando tus logros…';
    const { data, error } = await supabaseClient.rpc('book_affinity_achievement_stats');
    if (error) {
      showLoadError(error);
      return;
    }
    renderStats(data || {});
  }

  async function initialize() {
    setupTheme();
    setupMenu();
    if (elements.year) elements.year.textContent = String(new Date().getFullYear());
    if (elements.version) elements.version.textContent = `Versión ${config.webVersion || '0.6.3'} · ${config.webReleaseDate || '06/08/2026'}`;

    if (!supabaseClient) {
      await renderAccount(null);
      elements.loginRequired.hidden = false;
      return;
    }

    const { data } = await supabaseClient.auth.getSession();
    await loadForUser(data.session?.user || null);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => loadForUser(session?.user || null), 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
