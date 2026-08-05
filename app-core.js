const config = window.BOOK_AFFINITY_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase?.createClient);
const supabaseClient = configured
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
  : null;

const STATUS_LABELS = Object.freeze({
  want_to_read: 'Quiero leer',
  reading: 'Leyendo',
  finished: 'Terminado',
  paused: 'En pausa',
  abandoned: 'Abandonado'
});

const demoBooks = [
  {
    id: 'demo-el-nombre-del-viento',
    title: 'El nombre del viento',
    subtitle: 'Crónica del asesino de reyes: primer día',
    authors: ['Patrick Rothfuss'],
    description: 'La historia de Kvothe, músico, aventurero y leyenda, contada con su propia voz.',
    cover_url: 'assets/book-placeholder.svg',
    thumbnail_url: 'assets/book-placeholder.svg',
    categories: ['Fantasía', 'Aventura'],
    page_count: 880,
    current_page: 436,
    status: 'reading',
    rating: null,
    notes: 'Retomar desde el inicio del capítulo 53.',
    started_at: '2026-07-21',
    finished_at: null,
    publisher: 'Plaza & Janés',
    published_date: '2009',
    language: 'es',
    isbn_13: '9788401337208'
  },
  {
    id: 'demo-dune',
    title: 'Dune',
    subtitle: '',
    authors: ['Frank Herbert'],
    description: 'Una epopeya de política, religión, ecología y poder en el planeta Arrakis.',
    cover_url: 'assets/book-placeholder.svg',
    thumbnail_url: 'assets/book-placeholder.svg',
    categories: ['Ciencia ficción'],
    page_count: 784,
    current_page: 0,
    status: 'want_to_read',
    rating: null,
    notes: '',
    started_at: null,
    finished_at: null,
    publisher: 'Debolsillo',
    published_date: '2020',
    language: 'es',
    isbn_13: '9788466353779'
  },
  {
    id: 'demo-1984',
    title: '1984',
    subtitle: '',
    authors: ['George Orwell'],
    description: 'Una distopía sobre vigilancia, propaganda y la manipulación de la verdad.',
    cover_url: 'assets/book-placeholder.svg',
    thumbnail_url: 'assets/book-placeholder.svg',
    categories: ['Distopía', 'Clásicos'],
    page_count: 352,
    current_page: 352,
    status: 'finished',
    rating: 5,
    notes: 'Finalizado. Releer más adelante.',
    started_at: '2026-05-04',
    finished_at: '2026-05-19',
    publisher: 'Debolsillo',
    published_date: '2013',
    language: 'es',
    isbn_13: '9788499890944'
  }
];

const state = {
  books: [],
  user: null,
  filter: 'all',
  query: '',
  googleController: null
};

const elements = {
  menuToggle: document.querySelector('.menu-toggle'),
  nav: document.querySelector('#main-nav'),
  connectionState: document.querySelector('#connection-state'),
  libraryGrid: document.querySelector('#library-grid'),
  libraryEmpty: document.querySelector('#library-empty'),
  librarySummary: document.querySelector('#library-summary'),
  librarySearch: document.querySelector('#library-search'),
  filterButtons: [...document.querySelectorAll('[data-library-filter]')],
  statReading: document.querySelector('#stat-reading'),
  statWanted: document.querySelector('#stat-wanted'),
  statFinished: document.querySelector('#stat-finished'),
  statPages: document.querySelector('#stat-pages'),
  googleForm: document.querySelector('#google-search-form'),
  googleInput: document.querySelector('#google-search-input'),
  googleResults: document.querySelector('#google-results'),
  googleSummary: document.querySelector('#google-summary'),
  bookDialog: document.querySelector('#book-form-dialog'),
  bookForm: document.querySelector('#book-form'),
  bookFormTitle: document.querySelector('#book-form-title'),
  bookFormMessage: document.querySelector('#book-form-message'),
  formProgress: document.querySelector('#form-progress-preview'),
  authDialog: document.querySelector('#auth-dialog'),
  authForm: document.querySelector('#auth-form'),
  authButton: document.querySelector('#auth-button'),
  authMessage: document.querySelector('#auth-message'),
  signupButton: document.querySelector('#signup-button'),
  toast: document.querySelector('#toast')
};

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function safeImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'assets/book-placeholder.svg';
  if (value.startsWith('http:')) return value.replace(/^http:/, 'https:');
  return value;
}

function clampProgress(currentPage, pageCount) {
  const current = Math.max(0, Number(currentPage) || 0);
  const total = Math.max(0, Number(pageCount) || 0);
  if (!total) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

function formatAuthors(authors) {
  if (Array.isArray(authors)) return authors.filter(Boolean).join(', ') || 'Autor desconocido';
  return String(authors || 'Autor desconocido');
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function displayDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES').format(date);
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; }, 3200);
}

function showDialog(dialog) {
  if (!dialog) return;
  document.body.classList.add('has-modal');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
  document.body.classList.remove('has-modal');
}

function updateConnectionState() {
  if (!elements.connectionState) return;
  elements.connectionState.classList.remove('is-success', 'is-warning');

  if (!configured) {
    elements.connectionState.textContent = 'Modo de demostración · añade las claves públicas en config.js para conectar Supabase.';
    elements.connectionState.classList.add('is-warning');
    return;
  }

  if (state.user) {
    elements.connectionState.textContent = `Biblioteca sincronizada con Supabase · ${state.user.email}`;
    elements.connectionState.classList.add('is-success');
  } else {
    elements.connectionState.textContent = 'Supabase conectado · inicia sesión para ver y guardar tu biblioteca.';
    elements.connectionState.classList.add('is-warning');
  }
}

function updateAuthButton() {
  if (!elements.authButton) return;
  elements.authButton.textContent = state.user ? 'Salir' : 'Entrar';
  elements.authButton.title = state.user ? `Sesión iniciada como ${state.user.email}` : 'Iniciar sesión';
}
