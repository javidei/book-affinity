function mapGoogleBook(item) {
  const info = item.volumeInfo || {};
  const isbn10 = info.industryIdentifiers?.find(identifier => identifier.type === 'ISBN_10')?.identifier || null;
  const isbn13 = info.industryIdentifiers?.find(identifier => identifier.type === 'ISBN_13')?.identifier || null;
  return {
    google_books_id: item.id,
    title: info.title || 'Título no disponible',
    subtitle: info.subtitle || null,
    authors: info.authors || [],
    description: info.description || null,
    cover_url: safeImageUrl(info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.small || info.imageLinks?.thumbnail),
    thumbnail_url: safeImageUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
    categories: info.categories || [],
    page_count: Number(info.pageCount) || null,
    current_page: 0,
    status: 'want_to_read',
    rating: null,
    notes: null,
    publisher: info.publisher || null,
    published_date: info.publishedDate || null,
    language: info.language || null,
    isbn_10: isbn10,
    isbn_13: isbn13
  };
}

function createSearchResult(book) {
  const article = document.createElement('article');
  article.className = 'search-result-card';
  const image = document.createElement('img');
  image.src = safeImageUrl(book.thumbnail_url || book.cover_url);
  image.alt = `Portada de ${book.title}`;
  image.loading = 'lazy';
  image.addEventListener('error', () => { image.src = 'assets/book-placeholder.svg'; }, { once: true });

  const copy = document.createElement('div');
  copy.className = 'search-result-card__copy';
  const title = document.createElement('h3');
  title.textContent = book.title;
  const author = document.createElement('p');
  author.textContent = formatAuthors(book.authors);
  const meta = document.createElement('p');
  meta.textContent = [book.published_date?.slice?.(0, 4), book.page_count ? `${book.page_count} páginas` : '']
    .filter(Boolean)
    .join(' · ') || 'Edición sin paginación indicada';
  const button = document.createElement('button');
  button.className = 'button button--accent';
  button.type = 'button';
  button.textContent = 'Añadir a mi biblioteca';
  button.addEventListener('click', () => openBookForm(book));
  copy.append(title, author, meta, button);
  article.append(image, copy);
  return article;
}

async function searchGoogleBooks(event) {
  event.preventDefault();
  const query = elements.googleInput.value.trim();
  if (!query) return;

  elements.googleSummary.textContent = `Buscando “${query}”…`;
  elements.googleResults.innerHTML = '<div class="search-message">Consultando Google Books…</div>';
  state.googleController?.abort();
  state.googleController = new AbortController();

  const endpoint = new URL('https://www.googleapis.com/books/v1/volumes');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('maxResults', '18');
  endpoint.searchParams.set('printType', 'books');
  endpoint.searchParams.set('projection', 'full');
  if (config.googleBooksApiKey) endpoint.searchParams.set('key', config.googleBooksApiKey);

  try {
    const response = await fetch(endpoint, { signal: state.googleController.signal });
    if (!response.ok) throw new Error(`Google Books respondió con ${response.status}`);
    const data = await response.json();
    const books = (data.items || []).map(mapGoogleBook);
    elements.googleResults.replaceChildren(...books.map(createSearchResult));
    elements.googleSummary.textContent = books.length
      ? `${books.length} resultados para “${query}”.`
      : `No se encontraron libros para “${query}”.`;
    if (!books.length) elements.googleResults.innerHTML = '<div class="search-message">Prueba con otro título, autor o ISBN.</div>';
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(error);
    elements.googleSummary.textContent = 'No se ha podido completar la búsqueda.';
    elements.googleResults.innerHTML = '<div class="search-message">Configura una clave de Google Books en config.js o vuelve a intentarlo más tarde.</div>';
  }
}
