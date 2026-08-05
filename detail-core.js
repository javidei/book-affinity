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

const demoBooks = {
  'demo-el-nombre-del-viento': {
    id: 'demo-el-nombre-del-viento',
    title: 'El nombre del viento',
    subtitle: 'Crónica del asesino de reyes: primer día',
    authors: ['Patrick Rothfuss'],
    description: 'La historia de Kvothe, músico, aventurero y leyenda, contada con su propia voz. La ficha de demostración permite comprobar el diseño de progreso, notas y detalle antes de conectar Supabase.',
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
  'demo-dune': {
    id: 'demo-dune',
    title: 'Dune',
    subtitle: '',
    authors: ['Frank Herbert'],
    description: 'Una epopeya de política, religión, ecología y poder en el planeta Arrakis.',
    cover_url: 'assets/book-placeholder.svg',
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
  'demo-1984': {
    id: 'demo-1984',
    title: '1984',
    subtitle: '',
    authors: ['George Orwell'],
    description: 'Una distopía sobre vigilancia, propaganda y la manipulación de la verdad.',
    cover_url: 'assets/book-placeholder.svg',
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
};

const state = {
  id: new URLSearchParams(window.location.search).get('id'),
  user: null,
  book: null,
  history: []
};

const elements = {
  loading: document.querySelector('#detail-loading'),
  detail: document.querySelector('#book-detail'),
  cover: document.querySelector('#detail-cover'),
  status: document.querySelector('#detail-status'),
  title: document.querySelector('#detail-title'),
  subtitle: document.querySelector('#detail-subtitle'),
  authors: document.querySelector('#detail-authors'),
  tags: document.querySelector('#detail-tags'),
  percentage: document.querySelector('#detail-percentage'),
  progressFill: document.querySelector('#detail-progress-fill'),
  pages: document.querySelector('#detail-pages'),
  description: document.querySelector('#detail-description'),
  notes: document.querySelector('#detail-notes'),
  history: document.querySelector('#reading-history'),
  historyPanel: document.querySelector('#history-panel'),
  descriptionPanel: document.querySelector('#description-panel'),
  notesPanel: document.querySelector('#notes-panel'),
  editPanel: document.querySelector('#edit-panel'),
  editToggle: document.querySelector('#edit-toggle'),
  deleteButton: document.querySelector('#delete-book'),
  form: document.querySelector('#detail-form'),
  formMessage: document.querySelector('#detail-form-message'),
  cancelEdit: document.querySelector('#cancel-edit'),
  authButton: document.querySelector('#auth-button'),
  authDialog: document.querySelector('#auth-dialog'),
  authForm: document.querySelector('#auth-form'),
  authMessage: document.querySelector('#auth-message'),
  closeAuth: document.querySelector('#close-auth'),
  toast: document.querySelector('#toast')
};

function safeImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'assets/book-placeholder.svg';
  return value.startsWith('http:') ? value.replace(/^http:/, 'https:') : value;
}

function formatAuthors(authors) {
  return Array.isArray(authors) ? authors.filter(Boolean).join(', ') : String(authors || 'Autor desconocido');
}

function splitList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function progress(currentPage, pageCount) {
  const current = Math.max(0, Number(currentPage) || 0);
  const total = Math.max(0, Number(pageCount) || 0);
  return total ? Math.min(100, Math.round((current / total) * 100)) : 0;
}

function formatDate(value, includeTime = false) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; }, 3200);
}

function showDialog(dialog) {
  document.body.classList.add('has-modal');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  document.body.classList.remove('has-modal');
}

function renderNotFound(message) {
  elements.loading.innerHTML = `<h1>No encontramos este libro</h1><p>${message}</p><a class="button button--primary" href="index.html#biblioteca">Volver a la biblioteca</a>`;
}

function createTag(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}

function renderHistory() {
  elements.history.replaceChildren();
  if (!state.history.length) {
    const item = document.createElement('li');
    item.textContent = 'Todavía no hay cambios de progreso registrados.';
    elements.history.append(item);
    return;
  }

  state.history.forEach(update => {
    const item = document.createElement('li');
    const total = state.book.page_count || 0;
    const pct = progress(update.current_page, total);
    item.textContent = `${formatDate(update.recorded_at, true)} · página ${update.current_page || 0}${total ? ` de ${total}` : ''} · ${pct}% · ${STATUS_LABELS[update.status] || update.status}`;
    elements.history.append(item);
  });
}

function renderBook() {
  const book = state.book;
  document.title = `${book.title} · Book Affinity`;
  elements.cover.src = safeImageUrl(book.cover_url || book.thumbnail_url);
  elements.cover.alt = `Portada de ${book.title}`;
  elements.cover.onerror = () => { elements.cover.src = 'assets/book-placeholder.svg'; };
  elements.status.textContent = STATUS_LABELS[book.status] || 'Sin estado';
  elements.title.textContent = book.title;
  elements.subtitle.textContent = book.subtitle || '';
  elements.subtitle.hidden = !book.subtitle;
  elements.authors.textContent = formatAuthors(book.authors);

  const tags = [
    ...(book.categories || []),
    book.publisher,
    book.published_date?.slice?.(0, 4),
    book.language?.toUpperCase?.(),
    book.isbn_13 ? `ISBN ${book.isbn_13}` : '',
    book.rating ? `★ ${book.rating}/5` : ''
  ].filter(Boolean);
  elements.tags.replaceChildren(...tags.map(createTag));

  const pct = progress(book.current_page, book.page_count);
  elements.percentage.textContent = `${pct}%`;
  elements.progressFill.style.width = `${pct}%`;
  elements.pages.textContent = book.page_count
    ? `Página ${Number(book.current_page) || 0} de ${book.page_count}`
    : `Página actual: ${Number(book.current_page) || 0}. Indica el total para calcular el porcentaje.`;

  elements.description.textContent = book.description || 'No hay descripción disponible para este libro.';
  elements.notes.textContent = book.notes || 'Aún no has añadido notas personales.';
  elements.descriptionPanel.hidden = false;
  elements.notesPanel.hidden = false;

  fillEditForm();
  renderHistory();
  elements.loading.hidden = true;
  elements.detail.hidden = false;

  const canEdit = !configured || Boolean(state.user);
  elements.editToggle.hidden = !canEdit;
  elements.deleteButton.hidden = !canEdit;
}
