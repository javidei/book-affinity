// Enlace a la pantalla independiente de logros.
(() => {
  function ensureAchievementsLink() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return null;

    let link = nav.querySelector('#achievements-nav-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'achievements-nav-link';
      link.textContent = 'Logros';
      const authButton = nav.querySelector('#auth-button');
      nav.insertBefore(link, authButton || null);
    }

    link.href = 'achievements.html';
    return link;
  }

  function ensureFooterLink() {
    const footer = document.querySelector('.footer-links');
    if (!footer) return null;
    let link = footer.querySelector('[href="achievements.html"]');
    if (!link) {
      link = document.createElement('a');
      link.href = 'achievements.html';
      link.textContent = 'Logros';
      footer.append(link);
    }
    return link;
  }

  function removeEmbeddedAchievements() {
    document.querySelector('#logros')?.remove();
    document.querySelector('#achievements-rail')?.remove();
    document.body.classList.remove('has-achievements');
  }

  function updateAchievementsLinks() {
    const authenticated = Boolean(state?.user);
    const navLink = ensureAchievementsLink();
    const footerLink = ensureFooterLink();
    if (navLink) navLink.hidden = !authenticated;
    if (footerLink) footerLink.hidden = !authenticated;
    removeEmbeddedAchievements();
  }

  if (typeof updateAuthButton === 'function') {
    const originalUpdateAuthButton = updateAuthButton;
    updateAuthButton = function (...args) {
      const result = originalUpdateAuthButton.apply(this, args);
      updateAchievementsLinks();
      return result;
    };
  }

  window.refreshAchievements = async () => undefined;
  updateAchievementsLinks();
})();
