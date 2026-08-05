function fillEditForm() {
  const book = state.book;
  document.querySelector('#edit-title-input').value = book.title || '';
  document.querySelector('#edit-subtitle').value = book.subtitle || '';
  document.querySelector('#edit-authors').value = formatAuthors(book.authors).replace('Autor desconocido', '');
  document.querySelector('#edit-status').value = book.status || 'want_to_read';
  document.querySelector('#edit-current-page').value = book.current_page || 0;
  document.querySelector('#edit-page-count').value = book.page_count || '';
  document.querySelector('#edit-rating').value = book.rating || '';
  document.querySelector('#edit-started-at').value = book.started_at || '';
  document.querySelector('#edit-finished-at').value = book.finished_at || '';
  document.querySelector('#edit-categories').value = (book.categories || []).join(', ');
  document.querySelector('#edit-description').value = book.description || '';
  document.querySelector('#edit-notes').value = book.notes || '';
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
    finished_at: document.querySelector('#edit-finished-at').value || null,
    categories: splitList(document.querySelector('#edit-categories').value),
    description: document.querySelector('#edit-description').value.trim() || null,
    notes: document.querySelector('#edit-notes').value.trim() || null
  };

  if (status === 'reading' && !payload.started_at) payload.started_at = new Date().toISOString().slice(0, 10);
  if (status === 'finished' && !payload.finished_at) payload.finished_at = new Date().toISOString().slice(0, 10);
  return payload;
}

async function loadBook() {
  if (!state.id) {
    renderNotFound('Falta el identificador del libro en la dirección.');
    return;
  }

  if (!configured || !state.user) {
    state.book = demoBooks[state.id] || null;
    state.history = state.book
      ? [{ current_page: state.book.current_page, status: state.book.status, recorded_at: '2026-08-05T11:00:00Z' }]
      : [];
    if (!state.book) {
      renderNotFound(configured
        ? 'Inicia sesión para abrir los libros de tu biblioteca privada.'
        : 'Este identificador no existe en los datos de demostración.');
      return;
    }
    renderBook();
    return;
  }

  const [bookResult, historyResult] = await Promise.all([
    supabaseClient.from('books').select('*').eq('id', state.id).single(),
    supabaseClient.from('reading_updates').select('*').eq('book_id', state.id).order('recorded_at', { ascending: false }).limit(30)
  ]);

  if (bookResult.error || !bookResult.data) {
    console.error(bookResult.error);
    renderNotFound('El libro no existe o no pertenece a tu cuenta.');
    return;
  }

  state.book = bookResult.data;
  state.history = historyResult.data || [];
  renderBook();
}

async function saveChanges(event) {
  event.preventDefault();
  const payload = payloadFromForm();
  elements.formMessage.textContent = 'Guardando cambios…';

  if (!configured) {
    state.book = { ...state.book, ...payload };
    state.history.unshift({ current_page: payload.current_page, status: payload.status, recorded_at: new Date().toISOString() });
    renderBook();
    elements.editPanel.hidden = true;
    showToast('Cambios aplicados en la demostración.');
    return;
  }

  if (!state.user) {
    showDialog(elements.authDialog);
    return;
  }

  const { data, error } = await supabaseClient
    .from('books')
    .update(payload)
    .eq('id', state.book.id)
    .select()
    .single();

  if (error) {
    elements.formMessage.textContent = `No se pudo guardar: ${error.message}`;
    elements.formMessage.className = 'form-message field--wide is-error';
    return;
  }

  state.book = data;
  const historyResult = await supabaseClient
    .from('reading_updates')
    .select('*')
    .eq('book_id', state.book.id)
    .order('recorded_at', { ascending: false })
    .limit(30);
  state.history = historyResult.data || [];
  renderBook();
  elements.editPanel.hidden = true;
  showToast('Ficha actualizada.');
}

async function deleteBook() {
  const accepted = window.confirm(`¿Eliminar “${state.book.title}” de tu biblioteca? Esta acción no se puede deshacer.`);
  if (!accepted) return;

  if (!configured) {
    showToast('Libro eliminado de la demostración.');
    window.location.href = 'index.html#biblioteca';
    return;
  }

  if (!state.user) {
    showDialog(elements.authDialog);
    return;
  }

  const { error } = await supabaseClient.from('books').delete().eq('id', state.book.id);
  if (error) {
    showToast(`No se pudo eliminar: ${error.message}`);
    return;
  }
  window.location.href = 'index.html#biblioteca';
}
