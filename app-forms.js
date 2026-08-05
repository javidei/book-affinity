let bookCoverPreviewObjectUrl = '';

function releaseBookCoverPreview() {
  if (bookCoverPreviewObjectUrl) URL.revokeObjectURL(bookCoverPreviewObjectUrl);
  bookCoverPreviewObjectUrl = '';
}

function setBookCoverPreview(url) {
  const preview = document.querySelector('#book-cover-preview');
  if (!preview) return;
  preview.src = safeImageUrl(url);
  preview.onerror = () => { preview.src = 'assets/book-placeholder.svg'; };
}

function resetBookForm() {
  releaseBookCoverPreview();
  elements.bookForm.reset();
  document.querySelector('#book-id').value = '';
  document.querySelector('#google-books-id').value = '';
  document.querySelector('#cover-url').value = '';
  document.querySelector('#thumbnail-url').value = '';
  document.querySelector('#cover-path').value = '';
  document.querySelector('#book-status').value = 'want_to_read';
  document.querySelector('#book-current-page').value = 0;
  document.querySelector('#book-progress-percent').value = 0;
  setBookCoverPreview('assets/book-placeholder.svg');
  elements.bookFormTitle.textContent = 'Añadir libro';
  elements.bookFormMessage.textContent = '';
  elements.bookFormMessage.className = 'form-message';
  updateFormProgress('pages');
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
    document.querySelector('#cover-path').value = book.cover_path || '';
    document.querySelector('#book-title').value = book.title || '';
    document.querySelector('#book-subtitle').value = book.subtitle || '';
    document.querySelector('#book-authors').value = formatAuthors(book.authors).replace('Autor desconocido', '');
    document.querySelector('#book-status').value = book.status || 'want_to_read';
    document.querySelector('#book-page-count').value = book.page_count || '';
    document.querySelector('#book-current-page').value = book.current_page || 0;
    document.querySelector('#book-progress-percent').value = clampProgress(book.current_page, book.page_count);
    document.querySelector('#book-started-at').value = book.started_at || '';
    document.querySelector('#book-finished-at').value = book.finished_at || '';
    document.querySelector('#book-rating').value = book.rating || '';
    document.querySelector('#book-categories').value = (book.categories || []).join(', ');
    document.querySelector('#book-description').value = book.description || '';
    document.querySelector('#book-notes').value = book.notes || '';
    setBookCoverPreview(book.cover_url || book.thumbnail_url || 'assets/book-placeholder.svg');
  }
  updateFormProgress('pages');
  showDialog(elements.bookDialog);
  window.setTimeout(() => document.querySelector('#book-title')?.focus(), 50);
}

function updateFormProgress(source = 'pages') {
  const totalInput = document.querySelector('#book-page-count');
  const currentInput = document.querySelector('#book-current-page');
  const percentInput = document.querySelector('#book-progress-percent');
  const total = Math.max(0, Number(totalInput?.value) || 0);
  let current = Math.max(0, Number(currentInput?.value) || 0);
  let percent = Math.min(100, Math.max(0, Number(percentInput?.value) || 0));

  if (source === 'percent') {
    percentInput.value = String(Math.round(percent));
    if (total > 0) {
      current = Math.min(total, Math.round((total * percent) / 100));
      currentInput.value = String(current);
    }
  } else {
    if (total > 0) current = Math.min(total, current);
    currentInput.value = String(current);
    percent = clampProgress(current, total);
    percentInput.value = String(percent);
  }

  const strong = elements.formProgress?.querySelector('strong');
  const fill = elements.formProgress?.querySelector('.progress-track span');
  if (strong) strong.textContent = `${Math.round(percent)}%`;
  if (fill) fill.style.width = `${percent}%`;
}

function previewSelectedBookCover(event) {
  const [file] = event.target.files || [];
  releaseBookCoverPreview();
  if (!file) {
    setBookCoverPreview(document.querySelector('#cover-url').value || document.querySelector('#thumbnail-url').value || 'assets/book-placeholder.svg');
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    elements.bookFormMessage.textContent = 'La portada debe ser JPG, PNG o WEBP.';
    elements.bookFormMessage.className = 'form-message is-error';
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    elements.bookFormMessage.textContent = 'La portada no puede superar 5 MB.';
    elements.bookFormMessage.className = 'form-message is-error';
    event.target.value = '';
    return;
  }
  bookCoverPreviewObjectUrl = URL.createObjectURL(file);
  setBookCoverPreview(bookCoverPreviewObjectUrl);
  elements.bookFormMessage.textContent = 'La portada personalizada se subirá al guardar.';
  elements.bookFormMessage.className = 'form-message';
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
    finished_at: status === 'finished' ? (document.querySelector('#book-finished-at').value || null) : null,
    rating: Number(document.querySelector('#book-rating').value) || null,
    categories: splitList(document.querySelector('#book-categories').value),
    description: document.querySelector('#book-description').value.trim() || null,
    notes: document.querySelector('#book-notes').value.trim() || null,
    cover_url: document.querySelector('#cover-url').value.trim() || null,
    thumbnail_url: document.querySelector('#thumbnail-url').value.trim() || null,
    cover_path: document.querySelector('#cover-path').value.trim() || null
  };

  if (status === 'reading' && !payload.started_at) payload.started_at = new Date().toISOString().slice(0, 10);
  if (status === 'finished' && !payload.finished_at) payload.finished_at = new Date().toISOString().slice(0, 10);
  return payload;
}

async function uploadBookCover(file) {
  const extensionByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensionByType[file.type] || 'jpg';
  const uniqueName = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${state.user.id}/${uniqueName}.${extension}`;
  const { error } = await supabaseClient.storage.from('book-covers').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('book-covers').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function removeBookCover(path) {
  if (!path || !configured || !state.user) return;
  const { error } = await supabaseClient.storage.from('book-covers').remove([path]);
  if (error) console.warn('No se pudo eliminar la portada anterior.', error);
}

async function saveBook(event) {
  event.preventDefault();
  const payload = formPayload();
  const existingId = document.querySelector('#book-id').value;
  const oldCoverPath = payload.cover_path;
  const [coverFile] = document.querySelector('#book-cover-file').files || [];

  if (!payload.title) return;
  elements.bookFormMessage.textContent = 'Guardando…';
  elements.bookFormMessage.className = 'form-message';

  if (!configured) {
    if (coverFile) payload.cover_url = bookCoverPreviewObjectUrl;
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

  let uploadedPath = '';
  try {
    if (coverFile) {
      elements.bookFormMessage.textContent = 'Subiendo portada…';
      const uploaded = await uploadBookCover(coverFile);
      uploadedPath = uploaded.path;
      payload.cover_path = uploaded.path;
      payload.cover_url = uploaded.publicUrl;
      payload.thumbnail_url = uploaded.publicUrl;
    }

    const result = existingId
      ? await supabaseClient.from('books').update(payload).eq('id', existingId).select().single()
      : await supabaseClient.from('books').insert({ ...payload, user_id: state.user.id }).select().single();

    if (result.error) throw result.error;
    if (uploadedPath && oldCoverPath && oldCoverPath !== uploadedPath) await removeBookCover(oldCoverPath);

    closeDialog(elements.bookDialog);
    showToast(existingId ? 'Libro actualizado.' : 'Libro añadido a tu biblioteca.');
    await loadLibrary();
  } catch (error) {
    if (uploadedPath) await removeBookCover(uploadedPath);
    elements.bookFormMessage.textContent = error.code === '23505'
      ? 'Ese libro ya está guardado en tu biblioteca.'
      : `No se pudo guardar: ${error.message}`;
    elements.bookFormMessage.className = 'form-message is-error';
  }
}
