// Selector persistente de presentación para la biblioteca personal.
(() => {
  const STORAGE_KEY = 'book-affinity-library-view-v1';
  const DEFAULT_VIEW = 'cards';
  const VIEWS = Object.freeze([
    { id: 'covers', label: 'Portadas', icon: '▦', help: 'Muchas portadas y el texto imprescindible.' },
    { id: 'compact', label: 'Compacta', icon: '▥', help: 'Tarjetas pequeñas con título, autor y progreso.' },
    { id: 'cards', label: 'Tarjetas', icon: '▤', help: 'Equilibrio entre tamaño e información.' },
    { id: 'list', label: 'Lista', icon: '☷', help: 'Filas detalladas con descripción y todos los datos.' }
  ]);

  function validView(value) {
    return VIEWS.some(view => view.id === value) ? value : DEFAULT_VIEW;
  }

  function savedView() {
    try {
      return validView(window.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return DEFAULT_VIEW;
    }
  }

  function rememberView(view) {
    try {
      window.localStorage.setItem(STORAGE_KEY, view);
    } catch (_) {
      // La vista continúa funcionando durante la sesión aunque Storage esté bloqueado.
    }
  }

  function applyView(view, announce = false) {
    const selected = validView(view);
    const grid = document.querySelector('#library-grid');
    const toolbar = document.querySelector('#library-view-toolbar');
    if (!grid || !toolbar) return;

    grid.dataset.libraryView = selected;
    toolbar.dataset.activeView = selected;
    toolbar.querySelectorAll('[data-library-view]').forEach(button => {
      const active = button.dataset.libraryView === selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const definition = VIEWS.find(item => item.id === selected);
    const status = toolbar.querySelector('#library-view-status');
    if (status) status.textContent = announce ? `Vista ${definition.label} activada.` : '';
    rememberView(selected);
  }

  function createButton(view) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-view-button';
    button.dataset.libraryView = view.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Vista ${view.label}. ${view.help}`);
    button.title = view.help;

    const icon = document.createElement('span');
    icon.className = 'library-view-button__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = view.icon;

    const label = document.createElement('span');
    label.className = 'library-view-button__label';
    label.textContent = view.label;

    button.append(icon, label);
    button.addEventListener('click', () => applyView(view.id, true));
    return button;
  }

  function ensureViewToolbar() {
    const dashboard = document.querySelector('#biblioteca');
    const stats = dashboard?.querySelector('.stats-grid');
    const grid = dashboard?.querySelector('#library-grid');
    if (!dashboard || !stats || !grid) return;

    let toolbar = dashboard.querySelector('#library-view-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'library-view-toolbar';
      toolbar.className = 'library-view-toolbar';
      toolbar.setAttribute('aria-label', 'Opciones de visualización de la biblioteca');

      const copy = document.createElement('div');
      copy.className = 'library-view-toolbar__copy';
      const strong = document.createElement('strong');
      strong.textContent = 'Cómo mostrar los libros';
      const small = document.createElement('small');
      small.textContent = 'Elige el tamaño y la cantidad de información.';
      copy.append(strong, small);

      const controls = document.createElement('div');
      controls.className = 'library-view-controls';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Vista de libros');
      controls.append(...VIEWS.map(createButton));

      const status = document.createElement('span');
      status.id = 'library-view-status';
      status.className = 'sr-only';
      status.setAttribute('aria-live', 'polite');

      toolbar.append(copy, controls, status);
      stats.before(toolbar);
    }

    applyView(savedView());
  }

  ensureViewToolbar();
  window.setLibraryView = view => applyView(view, true);
})();
