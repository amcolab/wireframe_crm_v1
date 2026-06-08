/**
 * Shared column-filter wiring for entity list screens (CT01/AT01/PR01).
 */

import {
  applyColumnFilters,
  bindTableColumnFilters,
  renderColumnFilterRow,
  clearColumnFilters,
  captureColumnFilterFocus,
  restoreColumnFilterFocus,
} from './tableColumnFilters.js';

export { clearColumnFilters, captureColumnFilterFocus, restoreColumnFilterFocus };

export function mergeSetOptions(base = [], rows, key) {
  const fromData = (rows || []).map((r) => r[key]).filter(Boolean);
  return [...new Set([...base, ...fromData])].sort((a, b) => String(a).localeCompare(String(b), 'ja'));
}

export function buildSetOptionsMap(columns, getSetOptions) {
  const map = {};
  columns.forEach((col) => {
    if (col.filterType === 'set') map[col.key] = getSetOptions(col.key);
  });
  return map;
}

export function filterRowsWithColumnFilters(rows, textFilters, setFilters, columns, getSetOptions, dateFilters = {}) {
  const setOptionsMap = buildSetOptionsMap(columns, getSetOptions);
  return applyColumnFilters(rows, textFilters, setFilters, setOptionsMap, dateFilters);
}

export function ensureEntityListFilterRow(table, columns, textFilters, setFilters, getSetOptions, dateFilters = {}) {
  const thead = table?.querySelector('thead');
  if (!thead) return;
  renderColumnFilterRow(thead, columns, textFilters, setFilters, getSetOptions, dateFilters);
}

export function initEntityListColumnFilters({
  tableId,
  columns,
  state,
  getSetOptions,
  onRefreshList,
}) {
  const table = document.getElementById(tableId);
  if (!table) return;
  ensureEntityListFilterRow(
    table,
    columns,
    state.columnFilters,
    state.columnSetFilters,
    getSetOptions,
    state.columnDateFilters ?? {},
  );
  bindTableColumnFilters(table, {
    columns,
    textFilters: state.columnFilters,
    setFilters: state.columnSetFilters,
    dateFilters: state.columnDateFilters ?? {},
    getSetOptions,
    onChange: onRefreshList,
    debounceMs: 0,
  });
}

/**
 * Factory for lightweight refresh while typing (preserves filter input focus).
 */
export function createColumnFilterRefreshHandler({
  tableId,
  state,
  getDisplayRows,
  updatePagerAndBody,
  onSelectionChanged,
}) {
  return () => {
    const filterFocus = captureColumnFilterFocus(tableId);
    const prevSelectedId = state.selectedId;

    state.page = 1;
    const rows = getDisplayRows();

    if (rows.length && !rows.some((r) => String(r.id) === String(state.selectedId))) {
      state.selectedId = rows[0]?.id != null ? String(rows[0].id) : null;
    } else if (!rows.length) {
      state.selectedId = null;
    }

    updatePagerAndBody(rows);

    if (String(prevSelectedId) !== String(state.selectedId) && onSelectionChanged) {
      const selected = rows.find((r) => String(r.id) === String(state.selectedId));
      if (selected) onSelectionChanged(selected);
    }

    restoreColumnFilterFocus(filterFocus, tableId);
  };
}
