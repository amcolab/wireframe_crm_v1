/**
 * Per-column filters (ag-Grid floating / set filter style) for native table.t.
 * Text columns: contains (case-insensitive). Set columns: checkbox multi-select popup.
 * Date columns: range picker popup. Set columns show comma-separated values in a search-style input.
 */

import { includesPartial, escapeHtml } from './helpers.js';

function columnsSignature(columns) {
  return columns.map((c) => `${c.key}:${c.filterType || 'text'}`).join('|');
}

function isSetFilterActive(selected, allOptions) {
  if (!selected?.length || !allOptions?.length) return false;
  return selected.length < allOptions.length;
}

function isDateFilterActive(range = {}) {
  return !!(range.from || range.to);
}

function formatDateDisplay(iso) {
  if (!iso) return '';
  return String(iso).replace(/-/g, '/');
}

function getDateFilterSummary(range = {}) {
  const from = formatDateDisplay(range.from);
  const to = formatDateDisplay(range.to);
  if (!from && !to) return '';
  if (from && to) return `${from} ～ ${to}`;
  if (from) return `${from} ～`;
  return `～ ${to}`;
}

function parseComparableDate(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(/\//g, '-');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRowDateInRange(rowValue, range = {}) {
  const date = parseComparableDate(rowValue);
  if (!date) return false;
  const from = parseComparableDate(range.from);
  const to = parseComparableDate(range.to);
  if (from && date < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

/** @param {Record<string, string>} textFilters */
/** @param {Record<string, string[]>} setFilters */
/** @param {Record<string, { from?: string, to?: string }>} dateFilters */
export function applyColumnFilters(rows, textFilters, setFilters = {}, setOptionsMap = {}, dateFilters = {}) {
  if (!rows?.length) return rows ?? [];

  let result = rows;

  const textActive = Object.entries(textFilters || {}).filter(([, v]) => String(v ?? '').trim());
  if (textActive.length) {
    result = result.filter((row) => textActive.every(([key, needle]) => {
      return includesPartial(row[key] ?? '', needle);
    }));
  }

  Object.entries(dateFilters || {}).forEach(([key, range]) => {
    if (!isDateFilterActive(range)) return;
    result = result.filter((row) => isRowDateInRange(row[key], range));
  });

  Object.entries(setFilters || {}).forEach(([key, selected]) => {
    const allOpts = setOptionsMap[key] || [];
    if (!selected?.length || !isSetFilterActive(selected, allOpts)) return;
    const set = new Set(selected);
    result = result.filter((row) => set.has(String(row[key] ?? '')));
  });

  return result;
}

export function hasActiveColumnFilters(textFilters, setFilters = {}, setOptionsMap = {}, dateFilters = {}) {
  if (Object.values(textFilters || {}).some((v) => String(v ?? '').trim())) return true;
  if (Object.values(dateFilters || {}).some((range) => isDateFilterActive(range))) return true;
  return Object.entries(setFilters || {}).some(([key, selected]) => {
    const allOpts = setOptionsMap[key] || [];
    return isSetFilterActive(selected, allOpts);
  });
}

function buildTextFilterCell(col, val) {
  const active = String(val).trim() ? ' col-filter-active' : '';
  const hasVal = !!String(val).trim();
  return `<th class="col-filter-cell col-filter-cell--text${active}" data-filter-key="${col.key}">
    <div class="col-filter-wrap">
      <input type="text" class="col-filter-input" data-filter-key="${col.key}" value="${escapeHtml(val)}" aria-label="${escapeHtml(col.label)}で絞り込み" autocomplete="off" spellcheck="false" />
      <button type="button" class="col-filter-clear" data-filter-key="${col.key}" aria-label="クリア"${hasVal ? '' : ' hidden'}>×</button>
    </div>
  </th>`;
}

function getSetFilterSummary(selected, allOptions) {
  if (!isSetFilterActive(selected, allOptions)) return '';
  return selected.join(', ');
}

function buildSetFilterCell(col, selected, allOptions) {
  const active = isSetFilterActive(selected, allOptions) ? ' col-filter-active' : '';
  const summary = getSetFilterSummary(selected, allOptions);
  const hasVal = !!summary;
  return `<th class="col-filter-cell col-filter-cell--set${active}" data-filter-key="${col.key}">
    <div class="col-filter-wrap">
      <input type="text" class="col-filter-input col-filter-input--set" data-filter-key="${col.key}" data-filter-label="${escapeHtml(col.label)}" value="${escapeHtml(summary)}" placeholder="検索..." aria-label="${escapeHtml(col.label)}で絞り込み" readonly autocomplete="off" spellcheck="false" />
      <button type="button" class="col-filter-clear" data-filter-key="${col.key}" aria-label="クリア"${hasVal ? '' : ' hidden'}>×</button>
    </div>
  </th>`;
}

function buildDateFilterCell(col, range = {}) {
  const summary = getDateFilterSummary(range);
  const active = isDateFilterActive(range) ? ' col-filter-active' : '';
  const hasVal = isDateFilterActive(range);
  return `<th class="col-filter-cell col-filter-cell--date${active}" data-filter-key="${col.key}">
    <div class="col-filter-wrap">
      <input type="text" class="col-filter-input col-filter-input--date" data-filter-key="${col.key}" data-filter-label="${escapeHtml(col.label)}" value="${escapeHtml(summary)}" aria-label="${escapeHtml(col.label)}で絞り込み" readonly autocomplete="off" spellcheck="false" />
      <button type="button" class="col-filter-clear" data-filter-key="${col.key}" aria-label="クリア"${hasVal ? '' : ' hidden'}>×</button>
    </div>
  </th>`;
}

function syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions, dateFilters = {}) {
  columns.forEach((col) => {
    const cell = row.querySelector(`th.col-filter-cell[data-filter-key="${col.key}"]`);
    if (!cell) return;

    const filterType = col.filterType || 'text';

    if (filterType === 'set') {
      const opts = getSetOptions?.(col.key) || col.filterOptions || [];
      const selected = setFilters[col.key] || [];
      const active = isSetFilterActive(selected, opts);
      const summary = getSetFilterSummary(selected, opts);
      cell.classList.toggle('col-filter-active', active);
      const input = cell.querySelector('.col-filter-input--set');
      if (input && document.activeElement !== input) {
        input.value = summary;
      }
      const clearBtn = cell.querySelector('.col-filter-clear');
      if (clearBtn) clearBtn.hidden = !summary;
      return;
    }

    if (filterType === 'date') {
      const range = dateFilters[col.key] || {};
      const active = isDateFilterActive(range);
      const summary = getDateFilterSummary(range);
      cell.classList.toggle('col-filter-active', active);
      const input = cell.querySelector('.col-filter-input--date');
      if (input && document.activeElement !== input) {
        input.value = summary;
      }
      const clearBtn = cell.querySelector('.col-filter-clear');
      if (clearBtn) clearBtn.hidden = !active;
      return;
    }

    const val = textFilters[col.key] ?? '';
    const active = !!String(val).trim();
    cell.classList.toggle('col-filter-active', active);
    const input = cell.querySelector('.col-filter-input');
    if (input && document.activeElement !== input) {
      input.value = val;
    }
    const clearBtn = cell.querySelector('.col-filter-clear');
    if (clearBtn) clearBtn.hidden = !active;
  });
}

/**
 * @param {HTMLElement} thead
 * @param {{ key: string, label: string, filterType?: 'text'|'set'|'date', filterOptions?: string[] }[]} columns
 */
export function renderColumnFilterRow(thead, columns, textFilters, setFilters, getSetOptions, dateFilters = {}) {
  if (!thead || !columns?.length) return null;

  const sig = columnsSignature(columns);
  let row = thead.querySelector('tr.col-filter-row');

  if (row && row.dataset.colSig === sig) {
    syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions, dateFilters);
    return row;
  }

  if (!row) {
    row = document.createElement('tr');
    row.className = 'col-filter-row';
    const sortRow = thead.querySelector('tr:first-child');
    sortRow?.insertAdjacentElement('afterend', row);
  }

  row.dataset.colSig = sig;
  row.innerHTML = columns.map((col) => {
    const filterType = col.filterType || 'text';
    if (filterType === 'set') {
      const opts = getSetOptions?.(col.key) || col.filterOptions || [];
      return buildSetFilterCell(col, setFilters[col.key] || [], opts);
    }
    if (filterType === 'date') {
      return buildDateFilterCell(col, dateFilters[col.key] || {});
    }
    return buildTextFilterCell(col, textFilters[col.key] ?? '');
  }).join('');

  return row;
}

let activeFilterPopup = null;

function closeFilterPopup() {
  if (!activeFilterPopup) return;
  activeFilterPopup.el.remove();
  activeFilterPopup = null;
  document.removeEventListener('mousedown', onFilterPopupOutside, true);
  document.removeEventListener('keydown', onFilterPopupEscape, true);
}

function onFilterPopupOutside(e) {
  if (!activeFilterPopup) return;
  if (activeFilterPopup.el.contains(e.target) || activeFilterPopup.anchor.contains(e.target)) return;
  closeFilterPopup();
}

function onFilterPopupEscape(e) {
  if (e.key === 'Escape') closeFilterPopup();
}

function positionFilterPopup(popup, anchor) {
  const rect = anchor.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.left = `${Math.max(8, rect.left)}px`;
  popup.style.top = `${rect.bottom + 4}px`;
  popup.style.minWidth = `${Math.max(160, rect.width + 40)}px`;
  popup.style.zIndex = '1200';

  requestAnimationFrame(() => {
    const pr = popup.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      popup.style.left = `${Math.max(8, window.innerWidth - pr.width - 8)}px`;
    }
    if (pr.bottom > window.innerHeight - 8) {
      popup.style.top = `${Math.max(8, rect.top - pr.height - 4)}px`;
    }
  });
}

function openSetFilterPopup(anchor, key, label, options, setFilters, onApply) {
  closeFilterPopup();

  const selected = setFilters[key];
  const initiallyChecked = selected?.length
    ? new Set(selected)
    : new Set(options);

  const popup = document.createElement('div');
  popup.className = 'col-set-filter-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', `${label}の絞り込み`);

  popup.innerHTML = `
    <div class="col-set-filter-head">
      <input type="text" class="col-set-filter-search" placeholder="検索..." autocomplete="off" spellcheck="false" />
    </div>
    <label class="col-set-filter-all">
      <input type="checkbox" class="col-set-filter-all-cb" checked />
      <span>(すべて選択)</span>
    </label>
    <div class="col-set-filter-list"></div>
  `;

  const listEl = popup.querySelector('.col-set-filter-list');
  const searchEl = popup.querySelector('.col-set-filter-search');
  const allCb = popup.querySelector('.col-set-filter-all-cb');

  const renderList = (query = '') => {
    const q = query.trim().toLowerCase();
    const filteredOpts = q
      ? options.filter((o) => String(o).toLowerCase().includes(q))
      : options;

    listEl.innerHTML = filteredOpts.map((opt) => {
      const checked = initiallyChecked.has(opt) ? ' checked' : '';
      return `<label class="col-set-filter-item"><input type="checkbox" value="${escapeHtml(opt)}"${checked} /><span>${escapeHtml(opt)}</span></label>`;
    }).join('');

    syncAllCheckbox();
  };

  const getVisibleCheckboxes = () => [...listEl.querySelectorAll('input[type="checkbox"]')];

  const syncAllCheckbox = () => {
    const boxes = getVisibleCheckboxes();
    if (!boxes.length) {
      allCb.checked = false;
      allCb.indeterminate = false;
      return;
    }
    const checkedCount = boxes.filter((cb) => cb.checked).length;
    allCb.checked = checkedCount === boxes.length;
    allCb.indeterminate = checkedCount > 0 && checkedCount < boxes.length;
  };

  const applyFromPopup = () => {
    getVisibleCheckboxes().forEach((cb) => {
      if (cb.checked) initiallyChecked.add(cb.value);
      else initiallyChecked.delete(cb.value);
    });

    const checked = options.filter((o) => initiallyChecked.has(o));
    if (!checked.length || checked.length >= options.length) {
      delete setFilters[key];
    } else {
      setFilters[key] = checked;
    }
    onApply?.();
    syncAllCheckbox();
  };

  allCb.addEventListener('change', () => {
    const boxes = getVisibleCheckboxes();
    boxes.forEach((cb) => { cb.checked = allCb.checked; });
    applyFromPopup();
  });

  listEl.addEventListener('change', (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    applyFromPopup();
  });

  searchEl.addEventListener('input', () => renderList(searchEl.value));

  document.body.appendChild(popup);
  positionFilterPopup(popup, anchor);
  renderList();
  searchEl.focus();

  activeFilterPopup = { type: 'set', el: popup, anchor };
  document.addEventListener('mousedown', onFilterPopupOutside, true);
  document.addEventListener('keydown', onFilterPopupEscape, true);
}

function openDateFilterPopup(anchor, key, label, dateFilters, onApply) {
  closeFilterPopup();

  const current = dateFilters[key] || {};

  const popup = document.createElement('div');
  popup.className = 'col-date-filter-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', `${label}の期間絞り込み`);

  popup.innerHTML = `
    <div class="col-date-filter-range">
      <input type="date" class="col-date-filter-from" aria-label="開始日" />
      <span class="col-date-filter-sep">～</span>
      <input type="date" class="col-date-filter-to" aria-label="終了日" />
    </div>
  `;

  const fromEl = popup.querySelector('.col-date-filter-from');
  const toEl = popup.querySelector('.col-date-filter-to');
  fromEl.value = current.from || '';
  toEl.value = current.to || '';

  const applyRange = () => {
    const from = fromEl.value;
    const to = toEl.value;
    if (!from && !to) {
      delete dateFilters[key];
    } else {
      dateFilters[key] = { from, to };
    }
    onApply?.();
  };

  fromEl.addEventListener('change', applyRange);
  toEl.addEventListener('change', applyRange);

  document.body.appendChild(popup);
  positionFilterPopup(popup, anchor);
  fromEl.focus();

  activeFilterPopup = { type: 'date', el: popup, anchor };
  document.addEventListener('mousedown', onFilterPopupOutside, true);
  document.addEventListener('keydown', onFilterPopupEscape, true);
}

/**
 * @param {HTMLTableElement|HTMLElement} tableOrThead
 */
export function bindTableColumnFilters(tableOrThead, {
  columns = [],
  textFilters,
  setFilters,
  dateFilters = {},
  getSetOptions,
  onChange,
  debounceMs = 250,
}) {
  const thead = tableOrThead?.tagName === 'THEAD'
    ? tableOrThead
    : tableOrThead?.querySelector('thead');
  if (!thead || thead.dataset.colFilterBound === '1') return;
  thead.dataset.colFilterBound = '1';

  let timer = null;
  let rafId = null;
  const colByKey = new Map(columns.map((c) => [c.key, c]));

  const triggerChange = () => {
    if (debounceMs <= 0) {
      clearTimeout(timer);
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        onChange?.();
      });
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => onChange?.(), debounceMs);
  };

  const triggerChangeNow = () => {
    clearTimeout(timer);
    onChange?.();
  };

  const syncRow = () => {
    const row = thead.querySelector('tr.col-filter-row');
    if (row) syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions, dateFilters);
  };

  const openSetPopupForInput = (input) => {
    const key = input.getAttribute('data-filter-key');
    const col = colByKey.get(key);
    if (!col || col.filterType !== 'set') return;

    const label = input.getAttribute('data-filter-label') || col.label;
    const options = getSetOptions?.(key) || col.filterOptions || [];
    if (!options.length) return;

    if (activeFilterPopup?.anchor === input) {
      closeFilterPopup();
      return;
    }

    openSetFilterPopup(input, key, label, options, setFilters, () => {
      syncRow();
      triggerChangeNow();
    });
  };

  const openDatePopupForInput = (input) => {
    const key = input.getAttribute('data-filter-key');
    const col = colByKey.get(key);
    if (!col || col.filterType !== 'date') return;

    const label = input.getAttribute('data-filter-label') || col.label;

    if (activeFilterPopup?.anchor === input) {
      closeFilterPopup();
      return;
    }

    openDateFilterPopup(input, key, label, dateFilters, () => {
      syncRow();
      triggerChangeNow();
    });
  };

  thead.addEventListener('input', (e) => {
    const input = e.target.closest('.col-filter-input:not(.col-filter-input--set):not(.col-filter-input--date)');
    if (!input) return;
    const key = input.getAttribute('data-filter-key');
    const val = input.value;
    if (String(val).trim()) textFilters[key] = val;
    else delete textFilters[key];

    const cell = input.closest('.col-filter-cell');
    cell?.classList.toggle('col-filter-active', !!String(val).trim());
    const clearBtn = cell?.querySelector('.col-filter-clear');
    if (clearBtn) clearBtn.hidden = !String(val).trim();

    triggerChange();
  });

  thead.addEventListener('mousedown', (e) => {
    const setInput = e.target.closest('.col-filter-input--set');
    if (setInput) {
      e.preventDefault();
      openSetPopupForInput(setInput);
      return;
    }

    const dateInput = e.target.closest('.col-filter-input--date');
    if (dateInput) {
      e.preventDefault();
      openDatePopupForInput(dateInput);
    }
  });

  thead.addEventListener('click', (e) => {
    if (e.target.closest('.col-filter-row')) e.stopPropagation();

    const clearBtn = e.target.closest('.col-filter-clear');
    if (clearBtn) {
      e.preventDefault();
      const key = clearBtn.getAttribute('data-filter-key');
      const col = colByKey.get(key);
      const cell = clearBtn.closest('.col-filter-cell');
      const filterType = col?.filterType || 'text';

      if (filterType === 'set') {
        delete setFilters[key];
        const input = cell?.querySelector('.col-filter-input--set');
        if (input) input.value = '';
        cell?.classList.remove('col-filter-active');
        clearBtn.hidden = true;
        closeFilterPopup();
        triggerChangeNow();
        return;
      }

      if (filterType === 'date') {
        delete dateFilters[key];
        const input = cell?.querySelector('.col-filter-input--date');
        if (input) input.value = '';
        cell?.classList.remove('col-filter-active');
        clearBtn.hidden = true;
        closeFilterPopup();
        triggerChangeNow();
        return;
      }

      delete textFilters[key];
      const input = cell?.querySelector('.col-filter-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      cell?.classList.remove('col-filter-active');
      clearBtn.hidden = true;
      triggerChangeNow();
    }
  });

  thead.addEventListener('keydown', (e) => {
    const input = e.target.closest('.col-filter-input:not(.col-filter-input--set):not(.col-filter-input--date)');
    if (!input) return;
    if (e.key === 'Escape') {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    e.stopPropagation();
  });
}

export function clearColumnFilters(textFilters, setFilters, dateFilters) {
  if (textFilters) Object.keys(textFilters).forEach((k) => delete textFilters[k]);
  if (setFilters) Object.keys(setFilters).forEach((k) => delete setFilters[k]);
  if (dateFilters) Object.keys(dateFilters).forEach((k) => delete dateFilters[k]);
  closeFilterPopup();
}

/** Remember focused column filter input (for restore after table re-render). */
export function captureColumnFilterFocus(tableId = 'companyTable') {
  const el = document.activeElement;
  if (!el?.classList?.contains('col-filter-input')) return null;
  if (el.classList.contains('col-filter-input--set') || el.classList.contains('col-filter-input--date')) {
    return null;
  }
  const table = document.getElementById(tableId);
  if (!table?.contains(el)) return null;
  return {
    key: el.getAttribute('data-filter-key'),
    start: el.selectionStart,
    end: el.selectionEnd,
  };
}

/** Restore focus + caret after async DOM updates. */
export function restoreColumnFilterFocus(info, tableId = 'companyTable') {
  if (!info?.key) return;
  const key = info.key;
  requestAnimationFrame(() => {
    const table = document.getElementById(tableId);
    const input = table?.querySelector(
      `.col-filter-input[data-filter-key="${CSS.escape(key)}"]:not(.col-filter-input--set):not(.col-filter-input--date)`,
    );
    if (!input) return;
    input.focus({ preventScroll: true });
    if (typeof info.start === 'number' && typeof info.end === 'number') {
      try {
        input.setSelectionRange(info.start, info.end);
      } catch {
        /* ignore if type does not support selection */
      }
    }
  });
}
