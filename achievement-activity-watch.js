// Comprueba logros después de guardar cambios o modificar una conversación.
(() => {
  let observedCount = null;
  let lastValue = '';
  let countObserver = null;
  let delayedCheck = 0;

  function scheduleAchievementCheck() {
    window.clearTimeout(delayedCheck);
    delayedCheck = window.setTimeout(() => window.refreshAchievements?.(), 700);
    // Segunda comprobación por si la operación de Supabase o la recarga visual tarda más.
    window.setTimeout(() => window.refreshAchievements?.(), 1800);
  }

  function attachToCommentCount() {
    const node = document.querySelector('#comments-count');
    if (!node || node === observedCount) return;

    countObserver?.disconnect();
    observedCount = node;
    lastValue = node.textContent || '';
    countObserver = new MutationObserver(() => {
      const value = node.textContent || '';
      if (value === lastValue) return;
      lastValue = value;
      scheduleAchievementCheck();
    });
    countObserver.observe(node, { childList: true, characterData: true, subtree: true });
  }

  document.addEventListener('submit', event => {
    const formId = event.target?.id || '';
    if (['detail-form', 'comment-form'].includes(formId)) scheduleAchievementCheck();
  }, true);

  attachToCommentCount();
  const panelObserver = new MutationObserver(attachToCommentCount);
  panelObserver.observe(document.body, { childList: true, subtree: true });
})();
