/**
 * Drag-and-drop column reorder for tables with <colgroup> + keyed headers.
 * Keys: data-col-key or data-sort-key on <th>; matching data-col-key on <td>.
 */

const DEFAULT_KEY_ATTRS = ['data-col-key', 'data-sort-key'];

export function getColKey(el, keyAttrs = DEFAULT_KEY_ATTRS) {
  if (!el) return '';
  for (const attr of keyAttrs) {
    const v = el.getAttribute(attr);
    if (v) return v;
  }
  return '';
}

export function getTableColumnOrder(table, keyAttrs = DEFAULT_KEY_ATTRS) {
  const row = table?.querySelector('thead tr');
  if (!row) return [];
  return [...row.querySelectorAll('th')].map((th) => getColKey(th, keyAttrs)).filter(Boolean);
}

/**
 * Reorder <col>, <th>, and body <td data-col-key> to match orderKeys.
 */
export function applyTableColumnOrder(table, orderKeys, keyAttrs = DEFAULT_KEY_ATTRS) {
  if (!table || !orderKeys?.length) return;

  const theadRow = table.querySelector('thead tr');
  const colgroup = table.querySelector('colgroup');
  if (!theadRow || !colgroup) return;

  const ths = [...theadRow.querySelectorAll('th')];
  const cols = [...colgroup.querySelectorAll('col')];
  if (ths.length !== cols.length) return;

  const thByKey = new Map();
  const colByKey = new Map();
  ths.forEach((th, i) => {
    const key = getColKey(th, keyAttrs);
    if (key) {
      thByKey.set(key, th);
      colByKey.set(key, cols[i]);
    }
  });

  orderKeys.forEach((key) => {
    const th = thByKey.get(key);
    const col = colByKey.get(key);
    if (th) theadRow.appendChild(th);
    if (col) colgroup.appendChild(col);
  });

  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = [...tr.querySelectorAll('td[data-col-key]')];
    if (!cells.length) return;
    const tdByKey = new Map(cells.map((td) => [td.getAttribute('data-col-key'), td]));
    orderKeys.forEach((key) => {
      const td = tdByKey.get(key);
      if (td) tr.appendChild(td);
    });
  });
}

export function syncTableBodyColumnOrder(table, keyAttrs = DEFAULT_KEY_ATTRS) {
  applyTableColumnOrder(table, getTableColumnOrder(table, keyAttrs), keyAttrs);
}

function persistColumnOrder(table, storeKey, keyAttrs) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(getTableColumnOrder(table, keyAttrs)));
  } catch {
    /* ignore */
  }
}

function restoreColumnOrder(table, storeKey, keyAttrs) {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return;
    const order = JSON.parse(raw);
    if (Array.isArray(order) && order.length) applyTableColumnOrder(table, order, keyAttrs);
  } catch {
    /* ignore */
  }
}

function refreshWidthStore(table, widthStoreKey) {
  if (!widthStoreKey) return;
  try {
    const cols = table.querySelectorAll('colgroup col');
    const widths = Array.from(cols).map((c) => c.style.width || '');
    localStorage.setItem(widthStoreKey, JSON.stringify(widths));
  } catch {
    /* ignore */
  }
}

function moveColumnToIndex(table, fromKey, insertIdx, { storeKey, widthStoreKey, keyAttrs }) {
  const order = getTableColumnOrder(table, keyAttrs);
  const fromIdx = order.indexOf(fromKey);
  if (fromIdx < 0) return;

  order.splice(fromIdx, 1);
  const idx = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
  order.splice(Math.min(Math.max(0, idx), order.length), 0, fromKey);
  applyTableColumnOrder(table, order, keyAttrs);
  persistColumnOrder(table, storeKey, keyAttrs);
  refreshWidthStore(table, widthStoreKey);
}

/**
 * @param {string|HTMLTableElement} tableOrSelector
 * @param {object} [options]
 * @param {string} [options.storeKey='smos.table.colOrder']
 * @param {string} [options.widthStoreKey] - re-save col widths by index after reorder
 * @param {string[]} [options.keyAttrs]
 */
export function initTableColReorder(tableOrSelector, options = {}) {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table || table.dataset.colReorderInit === '1') return;

  const thead = table.querySelector('thead');
  const colgroup = table.querySelector('colgroup');
  if (!thead || !colgroup) return;

  const {
    storeKey = 'smos.table.colOrder',
    widthStoreKey = null,
    keyAttrs = DEFAULT_KEY_ATTRS,
  } = options;

  const ths = thead.querySelectorAll('tr:first-child th');
  const cols = colgroup.querySelectorAll('col');
  if (!ths.length || ths.length !== cols.length) return;

  table.dataset.colReorderInit = '1';

  restoreColumnOrder(table, storeKey, keyAttrs);

  let dragKey = null;

  ths.forEach((th) => {
    if (!getColKey(th, keyAttrs) || th.querySelector('.col-drag-handle')) return;

    const handle = document.createElement('span');
    handle.className = 'col-drag-handle';
    handle.setAttribute('draggable', 'true');
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('title', 'ドラッグで列を移動');
    handle.setAttribute('aria-label', '列を移動');
    handle.innerHTML = '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><circle cx="5" cy="4" r="1.2" fill="currentColor"/><circle cx="11" cy="4" r="1.2" fill="currentColor"/><circle cx="5" cy="8" r="1.2" fill="currentColor"/><circle cx="11" cy="8" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="11" cy="12" r="1.2" fill="currentColor"/></svg>';
    th.insertBefore(handle, th.firstChild);

    handle.addEventListener('dragstart', (e) => {
      dragKey = getColKey(th, keyAttrs);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragKey);
      th.classList.add('col-drag-source');
      document.body.classList.add('col-reordering');
    });

    handle.addEventListener('dragend', () => {
      th.classList.remove('col-drag-source');
      table.querySelectorAll('th.col-drop-before, th.col-drop-after').forEach((el) => {
        el.classList.remove('col-drop-before', 'col-drop-after');
      });
      document.body.classList.remove('col-reordering');
      dragKey = null;
    });

    handle.addEventListener('click', (e) => e.stopPropagation());

    th.addEventListener('dragover', (e) => {
      if (!dragKey) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = th.getBoundingClientRect();
      const before = e.clientX < rect.left + rect.width / 2;
      th.classList.toggle('col-drop-before', before);
      th.classList.toggle('col-drop-after', !before);
    });

    th.addEventListener('dragleave', () => {
      th.classList.remove('col-drop-before', 'col-drop-after');
    });

    th.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fromKey = e.dataTransfer.getData('text/plain') || dragKey;
      const toKey = getColKey(th, keyAttrs);
      th.classList.remove('col-drop-before', 'col-drop-after');

      if (!fromKey || !toKey) return;

      const order = getTableColumnOrder(table, keyAttrs);
      const toIdx = order.indexOf(toKey);
      if (toIdx < 0) return;

      const rect = th.getBoundingClientRect();
      const before = e.clientX < rect.left + rect.width / 2;
      const insertIdx = before ? toIdx : toIdx + 1;
      moveColumnToIndex(table, fromKey, insertIdx, { storeKey, widthStoreKey, keyAttrs });
    });
  });
}
