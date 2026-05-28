import { initTableColResize, syncResizableTableWidth } from './tableColResize.js';
import { initTableColReorder, syncTableBodyColumnOrder } from './tableColReorder.js';

/**
 * Enable column resize + reorder on a table (static or dynamically rendered).
 */
export function setupResizableTable(tableOrSelector, { orderKey, widthKey } = {}) {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table) return null;

  if (orderKey) {
    initTableColReorder(table, { storeKey: orderKey, widthStoreKey: widthKey });
  }
  if (widthKey) {
    initTableColResize(table, widthKey);
  }
  return table;
}

export function syncResizableTableBody(tableOrSelector) {
  const table = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!table) return;
  syncTableBodyColumnOrder(table);
  syncResizableTableWidth(table);
}

/** Build <colgroup> markup from [{ key, width }] */
export function buildColgroup(cols) {
  const colTags = cols.map((c) => `<col data-col-key="${c.key}" style="width:${c.width}px">`).join('');
  return `<colgroup>${colTags}</colgroup>`;
}

/** Build <thead> row with data-col-key on each <th> */
export function buildTheadRow(cols) {
  const ths = cols.map((c) => {
    const cls = c.className ? ` class="${c.className}"` : '';
    const label = c.label ?? c.key;
    return `<th data-col-key="${c.key}"${cls}>${label}</th>`;
  }).join('');
  return `<thead><tr>${ths}</tr></thead>`;
}
