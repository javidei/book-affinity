// Detecta logros recién desbloqueados y muestra un aviso con sonido.
(() => {
  const DEFINITIONS = Object.freeze([
    { id: 'first-book', title: 'Primera página', description: 'Has añadido tu primer libro.', metric: 'books_total', target: 1, icon: '📖', accent: '#d79a4d' },
    { id: 'first-follower', title: 'Alguien te lee', description: 'Has conseguido tu primer seguidor.', metric: 'followers_count', target: 1, icon: '👥', accent: '#7d5d95' },
    { id: 'first-following', title: 'Club de lectura', description: 'Has seguido a tu primer amigo lector.', metric: 'following_count', target: 1, icon: '🧭', accent: '#3f6b5a' },
    { id: 'first-finished', title: 'Final feliz', description: 'Has terminado tu primer libro.', metric: 'books_finished', target: 1, icon: '🏆', accent: '#be765f' },
    { id: 'trilogy', title: 'Trilogía completa', description: 'Ya has terminado tres libros.', metric: 'books_finished', target: 3, icon: '📚', accent: '#536fa1' },
    { id: 'first-public', title: 'Libro abierto', description: 'Has publicado tu primera lectura.', metric: 'books_public', target: 1, icon: '📡', accent: '#3f8067' },
    { id: 'first-comment', title: 'Romper el hielo', description: 'Has escrito tu primer comentario.', metric: 'comments_written', target: 1, icon: '💬', accent: '#a85879' },
    { id: 'first-reply', title: 'Conversación iniciada', description: 'Has recibido un comentario en un libro.', metric: 'comments_received', target: 1, icon: '💜', accent: '#8c5a9e' },
    { id: 'library-five', title: 'Estantería propia', description: 'Tu biblioteca ya contiene cinco libros.', metric: 'books_total', target: 5, icon: '🗂️', accent: '#a66f3d' },
    { id: 'pages-thousand', title: 'Mil páginas', description: 'Has registrado mil páginas de lectura.', metric: 'pages_total', target: 1000, icon: '✨', accent: '#496f87' },
    { id: 'library-ten', title: 'Biblioteca creciente', description: 'Has guardado diez libros.', metric: 'books_total', target: 10, icon: '🏛️', accent: '#bd7b43' },
    { id: 'library-twenty-five', title: 'Coleccionista', description: 'Has alcanzado veinticinco libros.', metric: 'books_total', target: 25, icon: '👑', accent: '#c08b33' },
    { id: 'finished-five', title: 'Racha lectora', description: 'Has terminado cinco libros.', metric: 'books_finished', target: 5, icon: '🥇', accent: '#bf6d58' },
    { id: 'finished-ten', title: 'Diez finales', description: 'Has terminado diez libros.', metric: 'books_finished', target: 10, icon: '🌿', accent: '#8864a0' },
    { id: 'followers-five', title: 'Pequeño club', description: 'Ya tienes cinco seguidores.', metric: 'followers_count', target: 5, icon: '🫂', accent: '#6553a4' },
    { id: 'followers-ten', title: 'Lector influyente', description: 'Ya tienes diez seguidores.', metric: 'followers_count', target: 10, icon: '⭐', accent: '#b56b8d' },
    { id: 'following-five', title: 'Explorador literario', description: 'Ya sigues a cinco lectores.', metric: 'following_count', target: 5, icon: '🗺️', accent: '#3f7d70' },
    { id: 'comments-ten', title: 'Comentarista', description: 'Has escrito diez comentarios.', metric: 'comments_written', target: 10, icon: '✒️', accent: '#9b657e' },
    { id: 'replies-ten', title: 'Libro debatido', description: 'Has recibido diez comentarios.', metric: 'comments_received', target: 10, icon: '🗨️', accent: '#6c5d9b' },
    { id: 'public-ten', title: 'Estantería pública', description: 'Has publicado diez libros.', metric: 'books_public', target: 10, icon: '🎭', accent: '#3e7861' }
  ]);

  const STORAGE_PREFIX = 'book-affinity-achievements-seen-v1';
  let fallbackClient = null;
  let checkPromise = null;
  let rerunRequested = false;
  let refreshTimer = 0;
  let audioContext = null;
  const notificationQueue = [];
  let notificationVisible = false;

  function getClient() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
    if (fallbackClient) return fallbackClient;
    const config = window.BOOK_AFFINITY_CONFIG || {};
    if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase?.createClient) return null;
    fallbackClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    return fallbackClient;
  }

  async function resolveUser(client, suppliedUser = null) {
    if (suppliedUser) return suppliedUser;
    if (typeof state !== 'undefined' && state?.user) return state.user;
    const { data } = await client.auth.getSession();
    return data.session?.user || null;
  }

  function metricValue(stats, definition) {
    return Math.max(0, Number(stats?.[definition.metric]) || 0);
  }

  function unlockedDefinitions(stats) {
    return DEFINITIONS.filter(definition => metricValue(stats, definition) >= definition.target);
  }

  function storageKey(userId) {
    return `${STORAGE_PREFIX}:${userId}`;
  }

  function readSeen(userId) {
    try {
      const raw = window.localStorage.getItem(storageKey(userId));
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeSeen(userId, ids) {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
    } catch (_) {
      // El aviso sigue funcionando durante esta sesión aunque el navegador bloquee Storage.
    }
  }

  function ensureHost() {
    let host = document.querySelector('#achievement-unlock-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'achievement-unlock-host';
    host.className = 'achievement-unlock-host';
    host.setAttribute('aria-live', 'assertive');
    host.setAttribute('aria-atomic', 'true');
    document.body.append(host);
    return host;
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    return audioContext;
  }

  function primeAudio() {
    const context = getAudioContext();
    if (context?.state === 'suspended') context.resume().catch(() => undefined);
  }

  function playUnlockSound() {
    const context = getAudioContext();
    if (!context) return;

    const play = () => {
      const start = context.currentTime + .02;
      [659.25, 783.99, 987.77].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = start + (index * .105);
        oscillator.type = index === 2 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(.115, noteStart + .018);
        gain.gain.exponentialRampToValueAtTime(.0001, noteStart + .22);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + .24);
      });
    };

    if (context.state === 'suspended') context.resume().then(play).catch(() => undefined);
    else play();
  }

  function removeNotification(card, immediate = false) {
    if (!card?.isConnected) return;
    card.classList.remove('is-visible');
    window.setTimeout(() => {
      card.remove();
      notificationVisible = false;
      showNextNotification();
    }, immediate ? 0 : 230);
  }

  function showNextNotification() {
    if (notificationVisible || !notificationQueue.length) return;
    notificationVisible = true;
    const definition = notificationQueue.shift();
    const host = ensureHost();
    const card = document.createElement('section');
    card.className = 'achievement-unlock';
    card.style.setProperty('--unlock-accent', definition.accent);
    card.setAttribute('role', 'status');

    const icon = document.createElement('span');
    icon.className = 'achievement-unlock__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = definition.icon;

    const copy = document.createElement('div');
    copy.className = 'achievement-unlock__copy';
    const eyebrow = document.createElement('small');
    eyebrow.textContent = 'Logro desbloqueado';
    const title = document.createElement('strong');
    title.textContent = definition.title;
    const description = document.createElement('p');
    description.textContent = definition.description;
    copy.append(eyebrow, title, description);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'achievement-unlock__close';
    close.setAttribute('aria-label', 'Cerrar aviso de logro');
    close.textContent = '×';
    close.addEventListener('click', () => removeNotification(card));

    card.append(icon, copy, close);
    host.replaceChildren(card);
    requestAnimationFrame(() => card.classList.add('is-visible'));
    playUnlockSound();
    window.dispatchEvent(new CustomEvent('book-affinity-achievement-unlocked', { detail: definition }));
    window.setTimeout(() => removeNotification(card), 6200);
  }

  function enqueueNotifications(definitions) {
    definitions.forEach(definition => notificationQueue.push(definition));
    showNextNotification();
  }

  async function performCheck(options = {}) {
    const client = getClient();
    if (!client) return [];
    const user = await resolveUser(client, options.user || null);
    if (!user) return [];

    let stats = options.stats || null;
    if (!stats) {
      const { data, error } = await client.rpc('book_affinity_achievement_stats');
      if (error) {
        console.warn('No se pudieron comprobar los logros.', error);
        return [];
      }
      stats = data || {};
    }

    const unlocked = unlockedDefinitions(stats);
    const unlockedIds = new Set(unlocked.map(definition => definition.id));
    const seen = readSeen(user.id);

    // La primera comprobación registra el estado actual sin bombardear al usuario
    // con logros que ya había conseguido antes de instalar esta mejora.
    if (seen === null) {
      writeSeen(user.id, unlockedIds);
      return [];
    }

    const newlyUnlocked = unlocked.filter(definition => !seen.has(definition.id));
    unlockedIds.forEach(id => seen.add(id));
    writeSeen(user.id, seen);

    if (newlyUnlocked.length && !options.silent) enqueueNotifications(newlyUnlocked);
    return newlyUnlocked;
  }

  function checkAchievements(options = {}) {
    if (checkPromise) {
      rerunRequested = true;
      return checkPromise;
    }

    checkPromise = performCheck(options).finally(() => {
      checkPromise = null;
      if (rerunRequested) {
        rerunRequested = false;
        window.setTimeout(() => checkAchievements(), 120);
      }
    });
    return checkPromise;
  }

  function scheduleCheck(delay = 220) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => checkAchievements(), delay);
  }

  function wrapAsyncFunction(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__achievementWrapped) return;
    const wrapped = async function (...args) {
      const result = await original.apply(this, args);
      scheduleCheck();
      return result;
    };
    wrapped.__achievementWrapped = true;
    window[name] = wrapped;
  }

  window.checkAchievementUnlocks = checkAchievements;
  window.refreshAchievements = () => checkAchievements();

  wrapAsyncFunction('loadLibrary');
  wrapAsyncFunction('loadSocialReaders');

  document.addEventListener('pointerdown', primeAudio, { once: true, capture: true });
  document.addEventListener('keydown', primeAudio, { once: true, capture: true });
  window.addEventListener('focus', () => scheduleCheck(350));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleCheck(350);
  });

  const client = getClient();
  client?.auth.onAuthStateChange((_event, session) => {
    if (session?.user) window.setTimeout(() => checkAchievements({ user: session.user }), 100);
  });

  window.setTimeout(() => checkAchievements(), 900);
})();
