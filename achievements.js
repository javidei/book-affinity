// Logros personales de Book Affinity.
(() => {
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

  let achievementStats = null;
  let loadingPromise = null;
  let refreshTimer = null;

  function isDetailPage() {
    return document.body.classList.contains('detail-page');
  }

  function achievementHref() {
    return isDetailPage() ? 'index.html#logros' : '#logros';
  }

  function metricValue(definition) {
    return Math.max(0, Number(achievementStats?.[definition.metric]) || 0);
  }

  function isUnlocked(definition) {
    return metricValue(definition) >= definition.target;
  }

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

  function ensureNavLink() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return null;
    let link = nav.querySelector('#achievements-nav-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'achievements-nav-link';
      link.textContent = 'Logros';
      const authButton = nav.querySelector('#auth-button');
      nav.insertBefore(link, authButton || null);
    }
    link.href = achievementHref();
    return link;
  }

  function ensureSection() {
    if (isDetailPage()) return null;
    let section = document.querySelector('#logros');
    if (section) return section;

    section = document.createElement('section');
    section.id = 'logros';
    section.className = 'achievements-section';
    section.setAttribute('aria-labelledby', 'achievements-title');
    section.innerHTML = `
      <div class="shell achievements-shell">
        <div class="achievements-heading">
          <div>
            <p class="eyebrow">Progreso personal</p>
            <h2 id="achievements-title">Tus logros lectores</h2>
            <p>Los diez logros principales están siempre visibles. Los logros secretos aparecen únicamente cuando los desbloqueas.</p>
          </div>
          <div class="achievements-total" aria-live="polite"><strong id="achievements-unlocked-count">0</strong><span>desbloqueados</span></div>
        </div>
        <p class="achievements-message" id="achievements-message" aria-live="polite"></p>
        <div class="achievements-grid" id="achievements-grid"></div>
        <p class="achievements-secret-note">✦ Todavía existen logros secretos que no se muestran hasta completarlos.</p>
      </div>`;

    const socialSection = document.querySelector('#lectores');
    const searchSection = document.querySelector('.search-section');
    if (socialSection) socialSection.before(section);
    else if (searchSection) searchSection.before(section);
    else document.querySelector('main')?.append(section);
    return section;
  }

  function ensureRail() {
    let rail = document.querySelector('#achievements-rail');
    if (rail) return rail;
    rail = document.createElement('aside');
    rail.id = 'achievements-rail';
    rail.className = 'achievements-rail';
    rail.setAttribute('aria-label', 'Logros lectores');
    rail.innerHTML = '<strong class="achievements-rail__title">Logros</strong><div class="achievements-rail__list" id="achievements-rail-list"></div>';
    document.body.append(rail);
    return rail;
  }

  function achievementCard(definition) {
    const unlocked = isUnlocked(definition);
    const current = metricValue(definition);
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
    currentText.textContent = unlocked ? 'Completado' : `${Math.min(current, definition.target).toLocaleString('es-ES')} / ${definition.target.toLocaleString('es-ES')}`;
    const percentage = document.createElement('strong');
    percentage.textContent = `${percent}%`;
    progressText.append(currentText, percentage);
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

  function railItem(definition) {
    const unlocked = isUnlocked(definition);
    const link = document.createElement('a');
    link.className = `achievements-rail__item ${unlocked ? 'is-unlocked' : 'is-locked'}${definition.secret ? ' is-secret' : ''}`;
    link.href = achievementHref();
    link.style.setProperty('--achievement-accent', definition.accent);
    link.dataset.label = `${definition.title} · ${unlocked ? 'desbloqueado' : 'bloqueado'}`;
    link.setAttribute('aria-label', link.dataset.label);
    link.innerHTML = iconSvg(definition.icon);
    return link;
  }

  function visibleDefinitions() {
    return DEFINITIONS.filter(definition => !definition.secret || isUnlocked(definition));
  }

  function renderAchievements() {
    if (!achievementStats) return;
    const visible = visibleDefinitions();
    const unlockedCount = DEFINITIONS.filter(isUnlocked).length;
    const section = ensureSection();
    const rail = ensureRail();

    const grid = section?.querySelector('#achievements-grid');
    if (grid) grid.replaceChildren(...visible.map(achievementCard));
    const count = section?.querySelector('#achievements-unlocked-count');
    if (count) count.textContent = String(unlockedCount);
    const message = section?.querySelector('#achievements-message');
    if (message) message.textContent = `${unlockedCount} de ${DEFINITIONS.length} logros completados.`;

    const railList = rail?.querySelector('#achievements-rail-list');
    if (railList) railList.replaceChildren(...visible.map(railItem));
  }

  function showLoadError(error) {
    const section = ensureSection();
    const message = section?.querySelector('#achievements-message');
    if (!message) return;
    const normalized = String(error?.message || error || '').toLowerCase();
    message.className = 'achievements-message is-error';
    message.textContent = normalized.includes('could not find the function') || normalized.includes('schema cache')
      ? 'Falta ejecutar supabase/achievements.sql en Supabase para activar los logros.'
      : `No se pudieron cargar los logros: ${error?.message || error}`;
  }

  function updateVisibility() {
    const authenticated = Boolean(state?.user);
    const link = ensureNavLink();
    const section = ensureSection();
    const rail = ensureRail();
    if (link) link.hidden = !authenticated;
    if (section) section.hidden = !authenticated;
    if (rail) rail.hidden = !authenticated;
    document.body.classList.toggle('has-achievements', authenticated);
  }

  async function loadAchievements() {
    updateVisibility();
    if (!configured || !state?.user || !supabaseClient) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      const { data, error } = await supabaseClient.rpc('book_affinity_achievement_stats');
      if (error) {
        showLoadError(error);
        return;
      }
      achievementStats = data || {};
      renderAchievements();
    })().finally(() => {
      loadingPromise = null;
    });

    return loadingPromise;
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => loadAchievements(), 80);
  }

  window.refreshAchievements = loadAchievements;
  ensureNavLink();
  ensureSection();
  ensureRail();
  updateVisibility();

  if (typeof updateAuthButton === 'function') {
    const originalUpdateAuthButton = updateAuthButton;
    updateAuthButton = function (...args) {
      const result = originalUpdateAuthButton.apply(this, args);
      updateVisibility();
      if (state?.user) scheduleRefresh();
      return result;
    };
  }

  if (typeof loadLibrary === 'function') {
    const originalLoadLibrary = loadLibrary;
    loadLibrary = async function (...args) {
      const result = await originalLoadLibrary.apply(this, args);
      if (state?.user) scheduleRefresh();
      return result;
    };
  }

  if (typeof window.loadSocialReaders === 'function') {
    const originalLoadSocialReaders = window.loadSocialReaders;
    window.loadSocialReaders = async (...args) => {
      const result = await originalLoadSocialReaders(...args);
      if (state?.user) scheduleRefresh();
      return result;
    };
  }

  window.addEventListener('focus', () => {
    if (state?.user) scheduleRefresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state?.user) scheduleRefresh();
  });
})();
