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
  const MIN_W = 50;

  function persist() {
    try {
      const widths = Array.from(cols).map(c => c.style.width || '');
      localStorage.setItem(storeKey, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      arr.forEach((w, i) => { if (cols[i] && w) cols[i].style.width = w; });
    } catch {
      /* ignore */
    }
  }

  restore();

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
      startW = th.getBoundingClientRect().width;
      handle.classList.add('dragging');
      document.body.classList.add('col-resizing');
      e.preventDefault();
      e.stopPropagation();
    }

    function onMove(e) {
      if (!dragging) return;
      const evt = e.touches ? e.touches[0] : e;
      const dx = evt.clientX - startX;
      cols[idx].style.width = `${Math.max(MIN_W, startW + dx)}px`;
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.classList.remove('col-resizing');
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
      table.style.tableLayout = 'auto';
      const naturalW = th.getBoundingClientRect().width;
      table.style.tableLayout = 'fixed';
      cols[idx].style.width = `${Math.max(MIN_W, Math.ceil(naturalW + 8))}px`;
      persist();
    });

    handle.addEventListener('click', (e) => e.stopPropagation());
  });
}
