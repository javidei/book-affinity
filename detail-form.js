let detailCoverPreviewObjectUrl = '';

function releaseDetailCoverPreview() {
  if (detailCoverPreviewObjectUrl) URL.revokeObjectURL(detailCoverPreviewObjectUrl);
  detailCoverPreviewObjectUrl = '';
}

function setDetailCoverPreview(url) {
  const preview = document.querySelector('#edit-cover-preview');
  if (!preview) return;
  preview.src = safeImageUrl(url);
  preview.onerror = () => { preview.src = 'assets/book-placeholder.svg'; };
}

function syncDetailProgress(source = 'pages') {
  const totalInput = document.querySelector('#edit-page-count');
  const currentInput = document.querySelector('#edit-current-page');
  const percentInput = document.querySelector('#edit-progress-percent');
  const total = Math.max(0, Number(totalInput.value) || 0);
  let current = Math.max(0, Number(currentInput.value) || 0);
  let percent = Math.min(100, Math.max(0, Number(percentInput.value) || 0));

  if (source === 'percent') {
    percentInput.value = String(Math.round(percent));
    if (total > 0) {
      current = Math.min(total, Math.round((total * percent) / 100));
      currentInput.value = String(current);
    }
  } else {
    if (total > 0) current = Math.min(total, current);
    currentInput.value = String(current);
    percentInput.value = String(progress(current, total));
  }
}

function previewDetailCover(event) {
  const [file] = event.target.files || [];
  releaseDetailCoverPreview();
  if (!file) {
    setDetailCoverPreview(state.book.cover_url || state.book.thumbnail_url || 'assets/book-placeholder.svg');
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    elements.formMessage.textContent = 'La portada debe ser JPG, PNG o WEBP.';
    elements.formMessage.className = 'form-message field--wide is-error';
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    elements.formMessage.textContent = 'La portada no puede superar 5 MB.';
    elements.formMessage.className = 'form-message field--wide is-error';
    event.target.value = '';
    return;
  }
  detailCoverPreviewObjectUrl = URL.createObjectURL(file);
  setDetailCoverPreview(detailCoverPreviewObjectUrl);
}

function fillEditForm() {
  const book = state.book;
  releaseDetailCoverPreview();
  document.querySelector('#edit-title-input').value = book.title || '';
  document.querySelector('#edit-subtitle').value = book.subtitle || '';
  document.querySelector('#edit-authors').value = formatAuthors(book.authors).replace('Autor desconocido', '');
  document.querySelector('#edit-status').value = book.status || 'want_to_read';
  document.querySelector('#edit-current-page').value = book.current_page || 0;
  document.querySelector('#edit-page-count').value = book.page_count || '';
  document.querySelector('#edit-progress-percent').value = progress(book.current_page, book.page_count);
  document.querySelector('#edit-rating').value = book.rating || '';
  document.querySelector('#edit-started-at').value = book.started_at || '';
  document.querySelector('#edit-finished-at').value = book.finished_at || '';
  document.querySelector('#edit-categories').value = (book.categories || []).join(', ');
  document.querySelector('#edit-description').value = book.description || '';
  document.querySelector('#edit-notes').value = book.notes || '';
  document.querySelector('#edit-cover-file').value = '';
  setDetailCoverPreview(book.cover_url || book.thumbnail_url || 'assets/book-placeholder.svg');
  elements.formMessage.textContent = '';
  elements.formMessage.className = 'form-message field--wide';
}

function payloadFromForm() {
  const status = document.querySelector('#edit-status').value;
  const pageCount = Number(document.querySelector('#edit-page-count').value) || null;
  let currentPage = Number(document.querySelector('#edit-current-page').value) || 0;
  if (status === 'finished' && pageCount) currentPage = pageCount;
  if (pageCount && currentPage > pageCount) currentPage = pageCount;
  const payload = {
    title: document.querySelector('#edit-title-input').value.trim(),
    subtitle: document.querySelector('#edit-subtitle').value.trim() || null,
    authors: splitList(document.querySelector('#edit-authors').value),
    status,
    current_page: currentPage,
    page_count: pageCount,
    rating: Number(document.querySelector('#edit-rating').value) || null,
    started_at: document.querySelector('#edit-started-at').value || null,
    finished_at: status === 'finished' ? (document.querySelector('#edit-finished-at').value || null) : null,
    categories: splitList(document.querySelector('#edit-categories').value),
    description: document.querySelector('#edit-description').value.trim() || null,
    notes: document.querySelector('#edit-notes').value.trim() || null,
    cover_url: state.book.cover_url || null,
    thumbnail_url: state.book.thumbnail_url || null,
    cover_path: state.book.cover_path || null
  };
  if (status === 'reading' && !payload.started_at) payload.started_at = new Date().toISOString().slice(0, 10);
  if (status === 'finished' && !payload.finished_at) payload.finished_at = new Date().toISOString().slice(0, 10);
  return payload;
}

async function uploadDetailCover(file) {
  const extensionByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensionByType[file.type] || 'jpg';
  const uniqueName = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${state.user.id}/${uniqueName}.${extension}`;
  const { error } = await supabaseClient.storage.from('book-covers').upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('book-covers').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function removeDetailCover(path) {
  if (!path || !configured || !state.user) return;
  const { error } = await supabaseClient.storage.from('book-covers').remove([path]);
  if (error) console.warn('No se pudo eliminar la portada.', error);
}

async function loadBook() {
  if (!state.id) { renderNotFound('Falta el identificador del libro en la dirección.'); return; }
  if (!configured || !state.user) {
    state.book = demoBooks[state.id] || null;
    state.history = state.book ? [{ current_page: state.book.current_page, status: state.book.status, recorded_at: '2026-08-05T11:00:00Z' }] : [];
    if (!state.book) {
      renderNotFound(configured ? 'Inicia sesión para abrir los libros de tu biblioteca privada.' : 'Este identificador no existe en los datos de demostración.');
      return;
    }
    renderBook();
    return;
  }
  const [bookResult, historyResult] = await Promise.all([
    supabaseClient.from('books').select('*').eq('id', state.id).single(),
    supabaseClient.from('reading_updates').select('*').eq('book_id', state.id).order('recorded_at', { ascending: false }).limit(30)
  ]);
  if (bookResult.error || !bookResult.data) { console.error(bookResult.error); renderNotFound('El libro no existe o no pertenece a tu cuenta.'); return; }
  state.book = bookResult.data;
  state.history = historyResult.data || [];
  renderBook();
}

async function saveChanges(event) {
  event.preventDefault();
  const payload = payloadFromForm();
  const oldCoverPath = state.book.cover_path || '';
  const [coverFile] = document.querySelector('#edit-cover-file').files || [];
  elements.formMessage.textContent = 'Guardando cambios…';
  elements.formMessage.className = 'form-message field--wide';

  if (!configured) {
    if (coverFile) payload.cover_url = detailCoverPreviewObjectUrl;
    state.book = { ...state.book, ...payload };
    state.history.unshift({ current_page: payload.current_page, status: payload.status, recorded_at: new Date().toISOString() });
    renderBook();
    elements.editPanel.hidden = true;
    showToast('Cambios aplicados en la demostración.');
    return;
  }
  if (!state.user) { showDialog(elements.authDialog); return; }

  let uploadedPath = '';
  try {
    if (coverFile) {
      elements.formMessage.textContent = 'Subiendo portada…';
      const uploaded = await uploadDetailCover(coverFile);
      uploadedPath = uploaded.path;
      payload.cover_path = uploaded.path;
      payload.cover_url = uploaded.publicUrl;
      payload.thumbnail_url = uploaded.publicUrl;
    }
    const { data, error } = await supabaseClient.from('books').update(payload).eq('id', state.book.id).select().single();
    if (error) throw error;
    if (uploadedPath && oldCoverPath && oldCoverPath !== uploadedPath) await removeDetailCover(oldCoverPath);
    state.book = data;
    const historyResult = await supabaseClient.from('reading_updates').select('*').eq('book_id', state.book.id).order('recorded_at', { ascending: false }).limit(30);
    state.history = historyResult.data || [];
    renderBook();
    elements.editPanel.hidden = true;
    showToast('Ficha actualizada.');
  } catch (error) {
    if (uploadedPath) await removeDetailCover(uploadedPath);
    elements.formMessage.textContent = `No se pudo guardar: ${error.message}`;
    elements.formMessage.className = 'form-message field--wide is-error';
  }
}

async function deleteBook() {
  const accepted = window.confirm(`¿Eliminar “${state.book.title}” de tu biblioteca? Esta acción no se puede deshacer.`);
  if (!accepted) return;
  if (!configured) { showToast('Libro eliminado de la demostración.'); window.location.href = 'index.html#biblioteca'; return; }
  if (!state.user) { showDialog(elements.authDialog); return; }
  const coverPath = state.book.cover_path || '';
  const { error } = await supabaseClient.from('books').delete().eq('id', state.book.id);
  if (error) { showToast(`No se pudo eliminar: ${error.message}`); return; }
  if (coverPath) await removeDetailCover(coverPath);
  window.location.href = 'index.html#biblioteca';
}
