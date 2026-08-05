function resetBookForm() {
  elements.bookForm.reset();
  document.querySelector('#book-id').value = '';
  document.querySelector('#google-books-id').value = '';
  document.querySelector('#cover-url').value = '';
  document.querySelector('#thumbnail-url').value = '';
  document.querySelector('#book-status').value = 'want_to_read';
  elements.bookFormTitle.textContent = 'Añadir libro';
  elements.bookFormMessage.textContent = '';
  elements.bookFormMessage.className = 'form-message';
  updateFormProgress();
}

function openBookForm(book = null) {
  if (configured && !state.user) {
    showDialog(elements.authDialog);
    elements.authMessage.textContent = 'Inicia sesión para guardar libros en tu biblioteca.';
    return;
  }

  resetBookForm();
  if (book) {
    document.querySelector('#book-id').value = book.id || '';
    document.querySelector('#google-books-id').value = book.google_books_id || '';
    document.querySelector('#cover-url').value = book.cover_url || '';
    document.querySelector('#thumbnail-url').value = book.thumbnail_url || '';
    document.querySelector('#book-title').value = book.title || '';
    document.querySelector('#book-subtitle').value = book.subtitle || '';
    document.querySelector('#book-authors').value = formatAuthors(book.authors).replace('Autor desconocido', '');
    document.querySelector('#book-status').value = book.status || 'want_to_read';
    document.querySelector('#book-page-count').value = book.page_count || '';
    document.querySelector('#book-current-page').value = book.current_page || 0;
    document.querySelector('#book-started-at').value = book.started_at || '';
    document.querySelector('#book-finished-at').value = book.finished_at || '';
    document.querySelector('#book-rating').value = book.rating || '';
    document.querySelector('#book-categories').value = (book.categories || []).join(', ');
    document.querySelector('#book-description').value = book.description || '';
    document.querySelector('#book-notes').value = book.notes || '';
  }
  updateFormProgress();
  showDialog(elements.bookDialog);
  window.setTimeout(() => document.querySelector('#book-title')?.focus(), 50);
}

function updateFormProgress() {
  const pageCount = document.querySelector('#book-page-count')?.value;
  const currentPage = document.querySelector('#book-current-page')?.value;
  const progress = clampProgress(currentPage, pageCount);
  const strong = elements.formProgress?.querySelector('strong');
  const fill = elements.formProgress?.querySelector('.progress-track span');
  if (strong) strong.textContent = `${progress}%`;
  if (fill) fill.style.width = `${progress}%`;
}

function formPayload() {
  const status = document.querySelector('#book-status').value;
  const pageCount = Number(document.querySelector('#book-page-count').value) || null;
  let currentPage = Number(document.querySelector('#book-current-page').value) || 0;
  if (status === 'finished' && pageCount) currentPage = pageCount;
  if (pageCount && currentPage > pageCount) currentPage = pageCount;

  const payload = {
    google_books_id: document.querySelector('#google-books-id').value.trim() || null,
    title: document.querySelector('#book-title').value.trim(),
    subtitle: document.querySelector('#book-subtitle').value.trim() || null,
    authors: splitList(document.querySelector('#book-authors').value),
    status,
    page_count: pageCount,
    current_page: currentPage,
    started_at: document.querySelector('#book-started-at').value || null,
    finished_at: document.querySelector('#book-finished-at').value || null,
    rating: Number(document.querySelector('#book-rating').value) || null,
    categories: splitList(document.querySelector('#book-categories').value),
    description: document.querySelector('#book-description').value.trim() || null,
    notes: document.querySelector('#book-notes').value.trim() || null,
    cover_url: document.querySelector('#cover-url').value.trim() || null,
    thumbnail_url: document.querySelector('#thumbnail-url').value.trim() || null
  };

  if (status === 'reading' && !payload.started_at) {
    payload.started_at = new Date().toISOString().slice(0, 10);
  }
  if (status === 'finished' && !payload.finished_at) {
    payload.finished_at = new Date().toISOString().slice(0, 10);
  }
  return payload;
}

async function saveBook(event) {
  event.preventDefault();
  const payload = formPayload();
  const existingId = document.querySelector('#book-id').value;

  if (!payload.title) return;
  elements.bookFormMessage.textContent = 'Guardando…';
  elements.bookFormMessage.className = 'form-message';

  if (!configured) {
    const newBook = { ...payload, id: existingId || `demo-${Date.now()}` };
    const index = state.books.findIndex(book => book.id === existingId);
    if (index >= 0) state.books[index] = newBook;
    else state.books.unshift(newBook);
    renderLibrary();
    closeDialog(elements.bookDialog);
    showToast('Libro guardado en la demostración. Configura Supabase para conservarlo.');
    return;
  }

  if (!state.user) {
    closeDialog(elements.bookDialog);
    showDialog(elements.authDialog);
    return;
  }

  let result;
  if (existingId) {
    result = await supabaseClient.from('books').update(payload).eq('id', existingId).select().single();
  } else {
    result = await supabaseClient.from('books').insert({ ...payload, user_id: state.user.id }).select().single();
  }

  if (result.error) {
    elements.bookFormMessage.textContent = result.error.code === '23505'
      ? 'Ese libro ya está guardado en tu biblioteca.'
      : `No se pudo guardar: ${result.error.message}`;
    elements.bookFormMessage.className = 'form-message is-error';
    return;
  }

  closeDialog(elements.bookDialog);
  showToast(existingId ? 'Libro actualizado.' : 'Libro añadido a tu biblioteca.');
  await loadLibrary();
}
