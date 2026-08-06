// Actualiza los logros cuando cambia la conversación de una ficha publicada.
(() => {
  let observedCount = null;
  let lastValue = '';
  let countObserver = null;

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
      window.refreshAchievements?.();
    });
    countObserver.observe(node, { childList: true, characterData: true, subtree: true });
  }

  attachToCommentCount();
  const panelObserver = new MutationObserver(attachToCommentCount);
  panelObserver.observe(document.body, { childList: true, subtree: true });
})();
