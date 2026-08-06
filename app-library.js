function createProgressBlock(book) {
  if (!['reading', 'paused'].includes(book.status)) return null;
  const progress = clampProgress(book.current_page, book.page_count);
  const wrapper = document.createElement('div');
  wrapper.className = 'progress-block';
  const line = document.createElement('div');
  line.className = 'progress-block__line';
  const pages = document.createElement('span');
  pages.textContent = book.page_count ? `Página ${Number(book.current_page) || 0} de ${book.page_count}` : `Página ${Number(book.current_page) || 0}`;
  const percentage = document.createElement('strong');
  percentage.textContent = `${progress}%`;
  line.append(pages, percentage);
  const track = document.createElement('div');
  track.className = 'progress-track';
  const fill = document.createElement('span');
  fill.style.width = `${progress}%`;
  track.append(fill);
  wrapper.append(line, track);
  return wrapper;
}

function createBookCard(book) {
  const article = document.createElement('article');
  article.className = `book-card book-card--${book.status || 'unknown'}`;
  const link = document.createElement('a');
  link.className = 'book-card__link';
  link.href = `book.html?id=${encodeURIComponent(book.id)}`;
  link.setAttribute('aria-label', `Ver detalles de ${book.title}`);
  const cover = document.createElement('div');
  cover.className = 'book-cover';
  const image = document.createElement('img');
  image.src = safeImageUrl(book.cover_url || book.thumbnail_url);
  image.alt = `Portada de ${book.title}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => { image.src = 'assets/book-placeholder.svg'; }, { once: true });
  const status = document.createElement('span');
  status.className = 'status-pill';
  status.textContent = STATUS_LABELS[book.status] || 'Sin estado';
  cover.append(image, status);
  const body = document.createElement('div');
  body.className = 'book-card__body';
  const meta = document.createElement('div');
  meta.className = 'book-card__meta';
  [book.published_date?.slice?.(0, 4), book.page_count ? `${book.page_count} págs.` : '', book.rating ? `★ ${book.rating}` : '']
    .filter(Boolean).forEach(value => { const badge = document.createElement('span'); badge.textContent = value; meta.append(badge); });
  const title = document.createElement('h3');
  title.textContent = book.title;
  const author = document.createElement('p');
  author.className = 'book-card__author';
  author.textContent = formatAuthors(book.authors);
  const description = document.createElement('p');
  description.className = 'book-card__description';
  description.textContent = book.description || 'Sin descripción disponible para esta edición.';
  const action = document.createElement('span');
  action.className = 'book-card__action';
  action.textContent = 'Ver detalles →';
  body.append(meta, title, author, description);
  const progress = createProgressBlock(book);
  if (progress) body.append(progress);
  body.append(action);
  link.append(cover, body);
  article.append(link);
  return article;
}

function renderSkeletons() {
  if (!elements.libraryGrid) return;
  elements.libraryGrid.setAttribute('aria-busy', 'true');
  elements.libraryGrid.replaceChildren(...Array.from({ length: 8 }, () => {
    const article = document.createElement('article');
    article.className = 'book-card book-card--skeleton';
    article.innerHTML = '<div class="book-cover skeleton"></div><div class="skeleton skeleton-line skeleton-line--short"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div>';
    return article;
  }));
}

function filteredBooks() {
  const query = normalizeText(state.query);
  return state.books.filter(book => {
    const matchesStatus = state.filter === 'all' || book.status === state.filter;
    const haystack = normalizeText([book.title, book.subtitle, formatAuthors(book.authors), ...(book.categories || [])].join(' '));
    return matchesStatus && (!query || haystack.includes(query));
  });
}

function updateStats() {
  const reading = state.books.filter(book => book.status === 'reading').length;
  const wanted = state.books.filter(book => book.status === 'want_to_read').length;
  const finished = state.books.filter(book => book.status === 'finished').length;
  const pages = state.books.reduce((sum, book) => sum + Math.max(0, Number(book.current_page) || 0), 0);
  elements.statReading.textContent = reading;
  elements.statWanted.textContent = wanted;
  elements.statFinished.textContent = finished;
  elements.statPages.textContent = new Intl.NumberFormat('es-ES').format(pages);
}

function renderLibrary() {
  const books = filteredBooks();
  elements.libraryGrid.replaceChildren(...books.map(createBookCard));
  elements.libraryGrid.setAttribute('aria-busy', 'false');
  elements.libraryEmpty.hidden = books.length !== 0;
  const label = books.length === 1 ? '1 libro visible' : `${books.length} libros visibles`;
  elements.librarySummary.textContent = configured && !state.user ? `${label} en la demostración. Inicia sesión para cargar tu biblioteca real.` : label;
  updateStats();
}

async function loadLibrary() {
  renderSkeletons();
  if (!configured || !state.user) {
    state.books = [...demoBooks];
    renderLibrary();
    return;
  }
  const { data, error } = await supabaseClient.from('books').select('*').order('updated_at', { ascending: false });
  if (error) {
    console.error(error);
    state.books = [...demoBooks];
    showToast('No se pudo cargar Supabase. Se muestran datos de ejemplo.');
  } else state.books = data || [];
  renderLibrary();
}
