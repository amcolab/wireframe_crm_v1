import { showToast } from './toast.js';

export function isEventFromSelectors(event, selectors) {
  const path = event.composedPath?.() ?? [];
  const nodes = path.length ? path : [event.target];
  return selectors.some((selector) => nodes.some((node) => node instanceof Element && node.matches?.(selector)));
}

export function shouldSkipCellCopyShortcut() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
    return true;
  }
  return (window.getSelection?.()?.toString?.() ?? '').length > 0;
}

export function createTableCellCopy(options = {}) {
  const {
    scopeSelector,
    emptyMessage = 'コピーできるセルがありません',
    successMessage = '行データをコピーしました',
    failMessage = 'コピーに失敗しました',
    useToast = true,
  } = options;

  const selection = {
    cellValue: '',
    containerId: null,
    rowId: null,
    colKey: null,
    cellIndex: -1,
  };

  function getContainer() {
    return selection.containerId ? document.getElementById(selection.containerId) : null;
  }

  function setSelectedCell(tr, td, container) {
    const root = container?.id ? container : container?.closest?.('[id]') || td?.closest?.('[id]') || tr?.closest?.('[id]');
    selection.containerId = root?.id || null;
    selection.rowId = tr?.getAttribute?.('data-id') ?? null;
    selection.colKey = td?.getAttribute?.('data-col-key') ?? null;
    selection.cellIndex = td && tr ? td.cellIndex : -1;
    selection.cellValue = td ? (td.textContent || '').trim() : '';
  }

  function highlightSelectedCell() {
    const container = getContainer();
    if (!container) return;
    container.querySelectorAll('td.cell-selected').forEach((el) => el.classList.remove('cell-selected'));
    if (!selection.colKey && selection.cellIndex < 0) return;

    const tr = selection.rowId
      ? container.querySelector(`tr[data-id="${CSS.escape(String(selection.rowId))}"]`)
      : container.querySelector('tbody tr');
    if (!tr) return;

    const td = selection.colKey
      ? tr.querySelector(`td[data-col-key="${CSS.escape(selection.colKey)}"]`)
      : tr.children[selection.cellIndex];
    td?.classList.add('cell-selected');
  }

  function isSelected(colKey, rowId, containerId) {
    if (selection.containerId !== containerId || selection.colKey !== colKey) return false;
    if (selection.rowId != null && rowId != null) {
      return String(selection.rowId) === String(rowId);
    }
    return true;
  }

  function cellClass(colKey, rowId, containerId, extra = '') {
    const classes = [extra, isSelected(colKey, rowId, containerId) ? 'cell-selected' : ''].filter(Boolean);
    return classes.length ? ` class="${classes.join(' ')}"` : '';
  }

  function clearSelection() {
    const container = getContainer();
    container?.querySelectorAll('td.cell-selected').forEach((el) => el.classList.remove('cell-selected'));
    selection.cellValue = '';
    selection.containerId = null;
    selection.rowId = null;
    selection.colKey = null;
    selection.cellIndex = -1;
  }

  async function copyCellText() {
    const text = selection.cellValue;
    if (!text) {
      if (useToast) showToast(emptyMessage, 'info');
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (useToast) showToast(successMessage, 'success');
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (useToast) showToast(successMessage, 'success');
        return true;
      } catch {
        if (useToast) showToast(failMessage, 'danger');
        return false;
      }
    }
  }

  let shortcutBound = false;
  function bindKeyboardCopy(extraCheck) {
    if (shortcutBound) return;
    shortcutBound = true;
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
      if (scopeSelector && !document.querySelector(scopeSelector)) return;
      if (!selection.cellValue) return;
      if (extraCheck?.() === false) return;
      if (shouldSkipCellCopyShortcut()) return;
      e.preventDefault();
      copyCellText();
    });
  }

  function bindTableTarget(target, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target.startsWith('#') ? target : `#${target}`) : target;
    if (!el || el.dataset.cellCopyBound === '1') return;
    el.dataset.cellCopyBound = '1';

    const resolveContainer = opts.getContainer || ((node) => node);
    const rowSelector = opts.rowSelector || 'tr';

    const handleSelect = (tr, td) => {
      setSelectedCell(tr, td, resolveContainer(el));
      if (opts.skipHighlight) return;
      highlightSelectedCell();
    };

    if (opts.onClick !== false) {
      el.addEventListener('click', (e) => {
        const td = e.target.closest('td');
        if (!td) return;
        const tr = td.closest(rowSelector);
        if (!tr) return;
        opts.onClick?.({ tr, td, e });
        handleSelect(tr, td);
      });
    }

    el.addEventListener('contextmenu', (e) => {
      const td = e.target.closest('td');
      if (!td) return;
      e.preventDefault();
      const tr = td.closest(rowSelector);
      handleSelect(tr, td);
      opts.onContextMenu?.({ tr, td, e, x: e.clientX, y: e.clientY });
    });
  }

  function bindOutsideClear({ root, ignoreSelectors = [], isActive }) {
    if (!root || root.dataset.cellSelectionDismissBound === '1') return;
    root.dataset.cellSelectionDismissBound = '1';

    document.addEventListener('click', (e) => {
      if (isActive?.() === false) return;
      if (isEventFromSelectors(e, ignoreSelectors)) return;
      clearSelection();
    });
  }

  return {
    selection,
    setSelectedCell,
    highlightSelectedCell,
    isSelected,
    cellClass,
    clearSelection,
    copyCellText,
    bindKeyboardCopy,
    bindTableTarget,
    bindOutsideClear,
    getCellValue: () => selection.cellValue,
  };
}
