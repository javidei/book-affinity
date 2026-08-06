// Visibilidad de las zonas privadas según la sesión activa.
(() => {
  function setHidden(selector, hidden) {
    document.querySelectorAll(selector).forEach(node => {
      node.hidden = hidden;
      node.setAttribute('aria-hidden', String(hidden));
    });
  }

  window.updateSessionVisibility = () => {
    const authenticated = Boolean(state?.user);
    const anonymous = configured && !authenticated;

    document.body.classList.toggle('is-authenticated', authenticated);
    document.body.classList.toggle('is-anonymous', anonymous);

    setHidden('#biblioteca', anonymous);
    setHidden('#lectores', anonymous);
    setHidden('.site-nav a[href$="#biblioteca"]', anonymous);
    setHidden('.site-nav a[href$="#lectores"]', anonymous);
    setHidden('.footer-links a[href$="#biblioteca"]', anonymous);
    setHidden('.back-link[href$="#biblioteca"]', anonymous);
    setHidden('#open-book-form', anonymous);
    setHidden('#footer-add-book', anonymous);
    setHidden('.hero__actions a[href="#biblioteca"]', anonymous);
  };

  if (typeof updateAuthButton === 'function') {
    const originalUpdateAuthButton = updateAuthButton;
    updateAuthButton = function (...args) {
      const result = originalUpdateAuthButton.apply(this, args);
      window.updateSessionVisibility();
      return result;
    };
  }

  if (typeof loadLibrary === 'function') {
    const originalLoadLibrary = loadLibrary;
    loadLibrary = async function (...args) {
      if (configured && !state?.user) {
        state.books = [];
        elements.libraryGrid?.replaceChildren();
        elements.libraryGrid?.setAttribute('aria-busy', 'false');
        if (elements.librarySummary) elements.librarySummary.textContent = '';
        if (elements.libraryEmpty) elements.libraryEmpty.hidden = true;
        if (elements.statReading) elements.statReading.textContent = '0';
        if (elements.statWanted) elements.statWanted.textContent = '0';
        if (elements.statFinished) elements.statFinished.textContent = '0';
        if (elements.statPages) elements.statPages.textContent = '0';
        window.updateSessionVisibility();
        return;
      }

      const result = await originalLoadLibrary.apply(this, args);
      window.updateSessionVisibility();
      return result;
    };
  }

  window.updateSessionVisibility();
})();
