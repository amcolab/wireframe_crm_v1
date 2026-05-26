/**
 * Drag-to-resize table columns (CRM CP01 pattern).
 * Requires <colgroup><col></col>…</colgroup> matching thead column count.
 */
export function initTableColResize(tableOrSelector, storeKey = 'smos.table.colWidths') {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table || table.dataset.colResizeInit === '1') return;

  const thead = table.querySelector('thead');
  const colgroup = table.querySelector('colgroup');
  if (!thead || !colgroup) return;

  const ths = thead.querySelectorAll('tr:first-child th');
  const cols = colgroup.querySelectorAll('col');
  if (!ths.length || ths.length !== cols.length) return;

  table.dataset.colResizeInit = '1';
  const MIN_W = 28;

  function parseColWidthFromAttr(col) {
    const raw = col.getAttribute('style') || col.style.cssText || '';
    const m = raw.match(/(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)px/i);
    if (m) return Math.round(parseFloat(m[1]));
    const n = parseInt(col.style.width, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function setColWidth(col, widthPx) {
    const px = `${Math.max(MIN_W, Math.round(widthPx))}px`;
    col.style.width = px;
    col.style.minWidth = px;
    col.style.maxWidth = px;
  }

  function readColWidthPx(col, th) {
    const fromStyle = parseInt(col.style.width, 10);
    if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle;
    const fromAttr = parseColWidthFromAttr(col);
    if (fromAttr > 0) return fromAttr;
    return Math.max(MIN_W, Math.ceil(th?.getBoundingClientRect().width || 0));
  }

  function getNaturalColWidth(col, th) {
    const fromAttr = parseColWidthFromAttr(col);
    if (fromAttr > 0) return fromAttr;
    return Math.max(MIN_W, Math.ceil(th.getBoundingClientRect().width) || 80);
  }

  /** Lock table width to sum of columns so other cols don't shrink/grow when container is wider. */
  function syncTableWidth() {
    let total = 0;
    cols.forEach((col, i) => {
      total += readColWidthPx(col, ths[i]);
    });
    if (total > 0) {
      table.style.width = `${total}px`;
    }
  }

  function lockAllColWidthsFromDom() {
    cols.forEach((col, i) => {
      setColWidth(col, getNaturalColWidth(col, ths[i]));
    });
    syncTableWidth();
  }

  function enableResizableLayout() {
    table.classList.add('table--col-resizable');
  }

  function persist() {
    try {
      const widths = Array.from(cols).map((c) => c.style.width || '');
      localStorage.setItem(storeKey, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return false;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length !== cols.length) return false;

      let total = 0;
      const widths = arr.map((w) => parseInt(w, 10));
      if (widths.some((n) => !Number.isFinite(n) || n < MIN_W)) return false;

      widths.forEach((widthNum, i) => {
        setColWidth(cols[i], widthNum);
        total += widthNum;
      });
      if (total < 200) return false;
      return true;
    } catch {
      return false;
    }
  }

  const restored = restore();
  if (!restored) {
    lockAllColWidthsFromDom();
  } else {
    syncTableWidth();
  }
  enableResizableLayout();

  ths.forEach((th, idx) => {
    if (!cols[idx] || th.querySelector('.col-resizer')) return;

    th.style.position = 'sticky';

    const handle = document.createElement('div');
    handle.className = 'col-resizer';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('title', 'ドラッグで列幅調整・ダブルクリックで自動幅');
    th.appendChild(handle);

    let dragging = false;
    let startX = 0;
    let startW = 0;

    function onDown(e) {
      const evt = e.touches ? e.touches[0] : e;
      dragging = true;
      startX = evt.clientX;
      startW = readColWidthPx(cols[idx], th);
      handle.classList.add('dragging');
      document.body.classList.add('col-resizing');
      e.preventDefault();
      e.stopPropagation();
    }

    function onMove(e) {
      if (!dragging) return;
      const evt = e.touches ? e.touches[0] : e;
      const dx = evt.clientX - startX;
      setColWidth(cols[idx], startW + dx);
      syncTableWidth();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.classList.remove('col-resizing');
      syncTableWidth();
      persist();
    }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);

    handle.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      cols[idx].style.width = '';
      cols[idx].style.minWidth = '';
      cols[idx].style.maxWidth = '';
      table.style.tableLayout = 'auto';
      const naturalW = th.getBoundingClientRect().width;
      table.style.tableLayout = 'fixed';
      setColWidth(cols[idx], Math.ceil(naturalW + 8));
      syncTableWidth();
      persist();
    });

    handle.addEventListener('click', (e) => e.stopPropagation());
  });
}

/** Re-sync table width after column reorder (call from tableColReorder). */
export function syncResizableTableWidth(tableOrSelector) {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table) return;

  const colgroup = table.querySelector('colgroup');
  const ths = table.querySelectorAll('thead tr:first-child th');
  const cols = colgroup?.querySelectorAll('col');
  if (!cols?.length) return;

  let total = 0;
  cols.forEach((col, i) => {
    const w = parseInt(col.style.width, 10);
    if (Number.isFinite(w) && w > 0) {
      total += w;
    } else {
      total += Math.ceil(ths[i]?.getBoundingClientRect().width || 0);
    }
  });
  if (total > 0) table.style.width = `${total}px`;
}
