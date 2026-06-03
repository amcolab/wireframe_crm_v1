/**
 * Per-column filters (ag-Grid floating / set filter style) for native table.t.
 * Text columns: contains (case-insensitive). Set columns: checkbox multi-select popup.
 */

import { includesPartial, escapeHtml } from './helpers.js';

const FILTER_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2 3h12M4.5 7h7M7 11h2"/></svg>';

function columnsSignature(columns) {
  return columns.map((c) => `${c.key}:${c.filterType || 'text'}`).join('|');
}

function isSetFilterActive(selected, allOptions) {
  if (!selected?.length || !allOptions?.length) return false;
  return selected.length < allOptions.length;
}

/** @param {Record<string, string>} textFilters */
/** @param {Record<string, string[]>} setFilters */
export function applyColumnFilters(rows, textFilters, setFilters = {}, setOptionsMap = {}) {
  if (!rows?.length) return rows ?? [];

  let result = rows;

  const textActive = Object.entries(textFilters || {}).filter(([, v]) => String(v ?? '').trim());
  if (textActive.length) {
    result = result.filter((row) => textActive.every(([key, needle]) => {
      return includesPartial(row[key] ?? '', needle);
    }));
  }

  Object.entries(setFilters || {}).forEach(([key, selected]) => {
    const allOpts = setOptionsMap[key] || [];
    if (!selected?.length || !isSetFilterActive(selected, allOpts)) return;
    const set = new Set(selected);
    result = result.filter((row) => set.has(String(row[key] ?? '')));
  });

  return result;
}

export function hasActiveColumnFilters(textFilters, setFilters = {}, setOptionsMap = {}) {
  if (Object.values(textFilters || {}).some((v) => String(v ?? '').trim())) return true;
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

function buildSetFilterCell(col, selected, allOptions) {
  const active = isSetFilterActive(selected, allOptions) ? ' col-filter-active' : '';
  const summary = getSetFilterSummary(selected, allOptions);
  return `<th class="col-filter-cell col-filter-cell--set${active}" data-filter-key="${col.key}">
    <div class="col-filter-wrap col-filter-wrap--set">
      <span class="col-filter-set-summary" data-filter-key="${col.key}">${escapeHtml(summary)}</span>
      <button type="button" class="col-filter-btn" data-filter-key="${col.key}" data-filter-label="${escapeHtml(col.label)}" aria-label="${escapeHtml(col.label)}で絞り込み" aria-haspopup="true">${FILTER_ICON}</button>
    </div>
  </th>`;
}

function getSetFilterSummary(selected, allOptions) {
  if (!isSetFilterActive(selected, allOptions)) return 'すべて';
  return `${selected.length}件`;
}

function syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions) {
  columns.forEach((col) => {
    const cell = row.querySelector(`th.col-filter-cell[data-filter-key="${col.key}"]`);
    if (!cell) return;

    if ((col.filterType || 'text') === 'set') {
      const opts = getSetOptions?.(col.key) || col.filterOptions || [];
      const selected = setFilters[col.key] || [];
      const active = isSetFilterActive(selected, opts);
      cell.classList.toggle('col-filter-active', active);
      const summary = cell.querySelector('.col-filter-set-summary');
      if (summary) summary.textContent = getSetFilterSummary(selected, opts);
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
 * @param {{ key: string, label: string, filterType?: 'text'|'set', filterOptions?: string[] }[]} columns
 */
export function renderColumnFilterRow(thead, columns, textFilters, setFilters, getSetOptions) {
  if (!thead || !columns?.length) return null;

  const sig = columnsSignature(columns);
  let row = thead.querySelector('tr.col-filter-row');

  if (row && row.dataset.colSig === sig) {
    syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions);
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
    if (col.filterType === 'set') {
      const opts = getSetOptions?.(col.key) || col.filterOptions || [];
      return buildSetFilterCell(col, setFilters[col.key] || [], opts);
    }
    return buildTextFilterCell(col, textFilters[col.key] ?? '');
  }).join('');

  return row;
}

let activeSetPopup = null;

function closeSetFilterPopup() {
  if (!activeSetPopup) return;
  activeSetPopup.el.remove();
  activeSetPopup = null;
  document.removeEventListener('mousedown', onSetPopupOutside, true);
  document.removeEventListener('keydown', onSetPopupEscape, true);
}

function onSetPopupOutside(e) {
  if (!activeSetPopup) return;
  if (activeSetPopup.el.contains(e.target) || activeSetPopup.anchor.contains(e.target)) return;
  closeSetFilterPopup();
}

function onSetPopupEscape(e) {
  if (e.key === 'Escape') closeSetFilterPopup();
}

function positionSetPopup(popup, anchor) {
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
  closeSetFilterPopup();

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
  positionSetPopup(popup, anchor);
  renderList();
  searchEl.focus();

  activeSetPopup = { el: popup, anchor };
  document.addEventListener('mousedown', onSetPopupOutside, true);
  document.addEventListener('keydown', onSetPopupEscape, true);
}

/**
 * @param {HTMLTableElement|HTMLElement} tableOrThead
 */
export function bindTableColumnFilters(tableOrThead, {
  columns = [],
  textFilters,
  setFilters,
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

  thead.addEventListener('input', (e) => {
    const input = e.target.closest('.col-filter-input');
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

  thead.addEventListener('click', (e) => {
    if (e.target.closest('.col-filter-row')) e.stopPropagation();

    const clearBtn = e.target.closest('.col-filter-clear');
    if (clearBtn) {
      e.preventDefault();
      const key = clearBtn.getAttribute('data-filter-key');
      delete textFilters[key];
      const cell = clearBtn.closest('.col-filter-cell');
      const input = cell?.querySelector('.col-filter-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      cell?.classList.remove('col-filter-active');
      clearBtn.hidden = true;
      triggerChangeNow();
      return;
    }

    const btn = e.target.closest('.col-filter-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const key = btn.getAttribute('data-filter-key');
    const col = colByKey.get(key);
    if (!col || col.filterType !== 'set') return;

    const label = btn.getAttribute('data-filter-label') || col.label;
    const options = getSetOptions?.(key) || col.filterOptions || [];
    if (!options.length) return;

    if (activeSetPopup?.anchor === btn) {
      closeSetFilterPopup();
      return;
    }

    openSetFilterPopup(btn, key, label, options, setFilters, () => {
      const row = thead.querySelector('tr.col-filter-row');
      if (row) syncFilterCellStates(row, columns, textFilters, setFilters, getSetOptions);
      triggerChangeNow();
    });
  });

  thead.addEventListener('keydown', (e) => {
    const input = e.target.closest('.col-filter-input');
    if (!input) return;
    if (e.key === 'Escape') {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    e.stopPropagation();
  });
}

export function clearColumnFilters(textFilters, setFilters) {
  if (textFilters) Object.keys(textFilters).forEach((k) => delete textFilters[k]);
  if (setFilters) Object.keys(setFilters).forEach((k) => delete setFilters[k]);
  closeSetFilterPopup();
}

/** Remember focused column filter input (for restore after table re-render). */
export function captureColumnFilterFocus(tableId = 'companyTable') {
  const el = document.activeElement;
  if (!el?.classList?.contains('col-filter-input')) return null;
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
      `.col-filter-input[data-filter-key="${CSS.escape(key)}"]`,
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
