const destinations = new Set(['oven', 'today', 'story', 'delivery', 'shop']);

export function setupBakeryNavigation({ oven, enterBakery, document = globalThis.document, window = globalThis.window }) {
  let pendingFrame = null;

  function destination(hash) {
    if (!hash?.startsWith('#')) return null;
    try {
      const id = decodeURIComponent(hash.slice(1));
      return destinations.has(id) ? id : null;
    } catch {
      return null;
    }
  }

  function navigate(hash, initial = false) {
    if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
    const id = destination(hash);
    if (!id || (initial && id === 'oven') || !document.getElementById(id)) return;
    if (id !== 'oven' && oven.dataset.view !== 'inside') enterBakery();
    const startedInside = oven.dataset.view === 'inside';

    // Entry changes data-view synchronously. Its MutationObserver reveals the
    // chapters at the microtask checkpoint, before this animation frame runs.
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = null;
      const target = document.getElementById(id);
      if (!target || target.closest('[hidden], [inert]')) return;
      if (startedInside && oven.dataset.view !== 'inside') return;
      if (id !== 'oven' && oven.dataset.view !== 'inside') return;
      const heading = id === 'oven'
        ? document.getElementById('toggle-door')
        : target.querySelector('h2');
      if (!heading || heading.closest('[hidden], [inert]')) return;
      if (id !== 'oven') heading.tabIndex = -1;
      target.scrollIntoView({ block: 'start' });
      heading.focus({ preventScroll: true });
    });
  }

  function onClick(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button > 0) return;
    const link = event.target?.closest?.('a[href^="#"]');
    if (link) navigate(link.getAttribute('href'));
    // Native anchors own the URL and history, including links to the same hash.
  }
  function onHashChange() { navigate(window.location.hash); }

  document.addEventListener('click', onClick);
  window.addEventListener('hashchange', onHashChange);
  navigate(window.location.hash, true);

  return () => {
    if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
    document.removeEventListener('click', onClick);
    window.removeEventListener('hashchange', onHashChange);
  };
}
