/** @type {Set<string>} */
const dismissListeners = new Set();

export function hideContextMenu(menu) {
  if (!menu) return;
  menu.style.display = 'none';
  menu.setAttribute('aria-hidden', 'true');
}

export function showContextMenu(menu, x, y) {
  if (!menu) return;
  menu.style.visibility = 'hidden';
  menu.style.display = 'block';
  menu.setAttribute('aria-hidden', 'false');
  const rect = menu.getBoundingClientRect();
  const left = Math.min(Math.max(0, x), Math.max(0, window.innerWidth - rect.width - 4));
  const top = Math.min(Math.max(0, y), Math.max(0, window.innerHeight - rect.height - 4));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = '';
}

/**
 * Register document/window dismiss handlers once per menu id.
 * @param {string} menuId
 * @param {() => void} hideFn
 */
export function ensureContextMenuDismiss(menuId, hideFn) {
  if (dismissListeners.has(menuId)) return;
  dismissListeners.add(menuId);

  document.addEventListener('click', (e) => {
    const menu = document.getElementById(menuId);
    if (!menu || menu.style.display !== 'block') return;
    if (e.target.closest(`#${menuId}`)) return;
    hideFn();
  });
  window.addEventListener('resize', hideFn);
  window.addEventListener('scroll', hideFn, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideFn();
  });
}

/**
 * Bind menu item clicks. Safe to call after SPA re-injects screen HTML.
 * @param {HTMLElement | null} menu
 * @param {(action: string, e: Event) => void | Promise<void>} onAction
 */
export function bindContextMenuActions(menu, onAction) {
  if (!menu || menu.dataset.menuActionsBound === '1') return;
  menu.dataset.menuActionsBound = '1';

  menu.addEventListener('click', async (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item || item.classList.contains('disabled')) return;
    const action = item.getAttribute('data-action');
    if (!action) return;
    await onAction(action, e);
    hideContextMenu(menu);
  });
}
