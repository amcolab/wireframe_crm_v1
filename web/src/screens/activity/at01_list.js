import { q, escapeHtml } from '../../utils/helpers.js';
import { bindAttachField } from '../../utils/attachField.js';
import { mockActivities } from '../../utils/mockData.js';
import { renderPageNumberButtons } from '../../utils/pager.js';
import { syncEntityDetailTabLayout } from '../../utils/entityTabTable.js';
import {
  bindAdvancedSearchForm,
  clearAdvancedSearch,
  hasSearchConditions,
  syncSearchFiltersIndicator,
} from '../../utils/searchFilters.js';
import { setupResizableTable, syncResizableTableBody } from '../../utils/tableColumns.js';
import { openContactCreateDialog } from '../../utils/contactCreateForm.js';
import { openActivityCreateDialog } from '../../utils/activityCreateForm.js';
import { openProjectCreateDialog } from '../../utils/projectCreateForm.js';
import { takePendingActivitySearch, bindCrossScreenLinks } from '../../utils/screenNavigation.js';
import { createTableCellCopy } from '../../utils/tableCellCopy.js';
import {
  hideContextMenu,
  showContextMenu,
  ensureContextMenuDismiss,
  bindContextMenuActions,
} from '../../utils/entityContextMenu.js';
import {
  clearColumnFilters,
  captureColumnFilterFocus,
  restoreColumnFilterFocus,
  mergeSetOptions,
  filterRowsWithColumnFilters,
  ensureEntityListFilterRow,
  initEntityListColumnFilters,
  createColumnFilterRefreshHandler,
} from '../../utils/entityListColumnFilters.js';
import { saleOptions } from '../../utils/contants.js';

const ACTIVITY_SET_OPTIONS = {
  rep: saleOptions.map((o) => o.label),
};

const ACTIVITY_MAIN_COLUMNS = [
  { key: 'date', label: '活動日' },
  { key: 'time', label: '開始時刻' },
  { key: 'rep', label: '営業担当', filterType: 'set' },
  { key: 'type', label: 'タイプ', filterType: 'set' },
  { key: 'company', label: '会社名' },
  { key: 'contact', label: '担当(姓)' },
  { key: 'comment', label: 'コメント' },
];

function getActivitySetOptions(key) {
  if (key === 'type') {
    return mergeSetOptions(['TEL', '訪問', 'メール'], state.activities, key);
  }
  return mergeSetOptions(ACTIVITY_SET_OPTIONS[key] || [], state.activities, key);
}

function getActivityDisplayFiltered() {
  return filterRowsWithColumnFilters(
    state.filtered,
    state.columnFilters,
    state.columnSetFilters,
    ACTIVITY_MAIN_COLUMNS,
    getActivitySetOptions,
  );
}

let refreshActivityListFromFilters;

let state = {
  activities: [...mockActivities],
  filtered: [...mockActivities],
  selectedId: mockActivities[0]?.id ?? null,
  page: 1,
  pageSize: 50,
  advanced: null,
  columnFilters: {},
  columnSetFilters: {},
};


const cellCopy = createTableCellCopy({ scopeSelector: '#activity-root', useToast: false });

export function init() {
  console.log('Activity screen (AT01) initialized');
  bindUi();
  bindActivityTable();
  setupResizableTable('#activityTable', {
    orderKey: 'smos.at01.colOrder',
    widthKey: 'smos.at01.colWidths',
  });
  refreshActivityListFromFilters = createColumnFilterRefreshHandler({
    tableId: 'activityTable',
    state,
    getDisplayRows: getActivityDisplayFiltered,
    updatePagerAndBody: updateActivityPagerAndTable,
    onSelectionChanged: (a) => fillDetailForm(a),
  });
  initEntityListColumnFilters({
    tableId: 'activityTable',
    columns: ACTIVITY_MAIN_COLUMNS,
    state,
    getSetOptions: getActivitySetOptions,
    onRefreshList: () => refreshActivityListFromFilters(),
  });
  initResizer();
  bindAttachField('activityDetailAttachList');
  const card = document.querySelector('#activity-root .company-detail');
  syncEntityDetailTabLayout(card, 'detail');
  applyPendingActivitySearch();
  bindCrossScreenLinks(q('activity-root'));
  setTimeout(() => render(), 200);
}

function applyPendingActivitySearch() {
  const pending = takePendingActivitySearch();
  if (!pending) return;
  const companyInput = q('activitySearchCompany');
  const repInput = q('activitySearchSalesRep');
  const typeSel = q('activitySearchType');
  if (companyInput) companyInput.value = pending.company || '';
  if (repInput) repInput.value = pending.contact || '';
  if (typeSel) typeSel.value = pending.type || '';
  applySearch();
}

function getSelectedActivity() {
  return state.activities.find(a => String(a.id) === String(state.selectedId))
    || state.filtered.find(a => String(a.id) === String(state.selectedId))
    || state.filtered[0]
    || null;
}

function bindUi() {
  const root = q('activity-root');
  if (root?.dataset.bound) return;
  root.dataset.bound = 'true';

  const btnActivityAdv = q('btnActivityAdvancedSearch');
  bindAdvancedSearchForm({
    btn: btnActivityAdv,
    dlg: q('dlgActivityAdvancedSearch'),
    form: q('formActivityAdvancedSearch'),
    state,
    onApply: applySearch,
  });

  const onActivityBasicInput = () => {
    if (!hasActivityBasicSearch() && !hasSearchConditions(state.advanced)) {
      syncSearchFiltersIndicator(btnActivityAdv, null);
    }
  };
  ['activitySearchType', 'activitySearchSalesRep', 'activitySearchCompany', 'activitySearchDateFrom', 'activitySearchDateTo']
    .forEach((id) => q(id)?.addEventListener('input', onActivityBasicInput));
  q('activitySearchType')?.addEventListener('change', onActivityBasicInput);

  q('btnActivitySearch')?.addEventListener('click', applySearch);
  q('btnActivityClear')?.addEventListener('click', () => {
    if (q('activitySearchType')) q('activitySearchType').value = '';
    if (q('activitySearchSalesRep')) q('activitySearchSalesRep').value = '';
    if (q('activitySearchCompany')) q('activitySearchCompany').value = '';
    if (q('activitySearchDateFrom')) q('activitySearchDateFrom').value = '';
    if (q('activitySearchDateTo')) q('activitySearchDateTo').value = '';
    clearAdvancedSearch({
      btn: btnActivityAdv,
      form: q('formActivityAdvancedSearch'),
      state,
    });
    clearColumnFilters(state.columnFilters, state.columnSetFilters);
    state.filtered = [...state.activities];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ?? null;
    render();
  });
  q('btnActivityNewMain')?.addEventListener('click', () => { openActivityCreateDialog(); });
  q('btnAtDetailContactLookup')?.addEventListener('click', () => { q('dlgContactLookup')?.showModal(); });
  q('btnAtDetailContactNew')?.addEventListener('click', () => { openContactCreateDialog(); });
  q('btnAtDetailProjectLookup')?.addEventListener('click', () => { q('dlgProjectLookup')?.showModal(); });
  q('btnAtDetailProjectNew')?.addEventListener('click', () => { openProjectCreateDialog(); });
  q('btnAtDetailSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnAtDetailDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  q('btnActivityFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnActivityPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnActivityNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(getActivityDisplayFiltered().length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnActivityLastPage')?.addEventListener('click', () => {
    state.page = Math.max(1, Math.ceil(getActivityDisplayFiltered().length / state.pageSize));
    render();
  });
  q('activityPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value, 10) || 1;
    render();
  });
  q('activityPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10) || 50;
    state.page = 1;
    render();
  });

  bindActivityContextMenu();

  cellCopy.bindOutsideClear({
    root,
    ignoreSelectors: ['#activityTable', '#activityContextMenu'],
    isActive: () => !!q('activity-root'),
  });
}

function bindActivityContextMenu() {
  const table = q('activityTable');
  const menu = q('activityContextMenu');
  if (!table || !menu) return;

  if (table.dataset.contextMenuBound !== '1') {
    table.dataset.contextMenuBound = '1';
    table.addEventListener('contextmenu', (e) => {
      const withinTable = e.target.closest('#activityTable');
      if (!withinTable) return;
      e.preventDefault();
      const tr = e.target.closest('tbody tr[data-id]');
      const td = e.target.closest('td');
      cellCopy.setSelectedCell(tr, td, table);
      cellCopy.highlightSelectedCell();
      showContextMenu(menu, e.clientX, e.clientY);
    });
  }

  bindContextMenuActions(menu, async (action) => {
    if (action === 'copy') {
      await cellCopy.copyCellText();
    } else if (action === 'new-activity') {
      q('btnActivityNewMain')?.click();
    }
  });

  ensureContextMenuDismiss('activityContextMenu', () => hideContextMenu(menu));
  cellCopy.bindKeyboardCopy(() => !!q('activity-root'));
}

function hasActivityBasicSearch() {
  return !!(
    q('activitySearchType')?.value
    || q('activitySearchSalesRep')?.value?.trim()
    || q('activitySearchCompany')?.value?.trim()
    || q('activitySearchDateFrom')?.value
    || q('activitySearchDateTo')?.value
  );
}

function applySearch() {
  const type = q('activitySearchType')?.value;
  const rep = q('activitySearchSalesRep')?.value?.trim();
  const company = q('activitySearchCompany')?.value?.trim();
  state.filtered = state.activities.filter(a => {
    if (type && a.type !== type) return false;
    if (rep && !(a.rep || '').includes(rep)) return false;
    if (company && !(a.company || '').includes(company)) return false;
    return true;
  });
  state.page = 1;
  state.selectedId = state.filtered[0]?.id ?? null;
  render();
}

function bindActivityTable() {
  const tbody = q('activityTableBody');
  if (!tbody || tbody.dataset.clickBound === '1') return;
  tbody.dataset.clickBound = '1';
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    cellCopy.setSelectedCell(tr, e.target.closest('td'), q('activityTable'));
    const a = getSelectedActivity();
    if (a) fillDetailForm(a);
    render();
    cellCopy.highlightSelectedCell();
  });

  if (tbody.dataset.keyboardBound !== '1') {
    tbody.dataset.keyboardBound = '1';
    document.addEventListener('keydown', (e) => {
      if (!q('activity-root')) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const rows = Array.from(tbody.querySelectorAll('tr[data-id]'));
      if (!rows.length) return;

      const currentIdx = rows.findIndex((row) => String(row.getAttribute('data-id')) === String(state.selectedId));
      let nextIdx = currentIdx >= 0 ? currentIdx : 0;
      if (e.key === 'ArrowUp') nextIdx = Math.max(0, nextIdx - 1);
      if (e.key === 'ArrowDown') nextIdx = Math.min(rows.length - 1, nextIdx + 1);
      if (nextIdx === currentIdx) return;

      e.preventDefault();
      state.selectedId = rows[nextIdx].getAttribute('data-id');
      // Row navigation should not keep prior copied-cell highlight.
      cellCopy.clearSelection();
      const selected = getSelectedActivity();
      if (selected) fillDetailForm(selected);
      render();
    });
  }
}

function render() {
  const filterFocus = captureColumnFilterFocus('activityTable');
  syncSearchFiltersIndicator(q('btnActivityAdvancedSearch'), state.advanced);

  ensureEntityListFilterRow(
    q('activityTable'),
    ACTIVITY_MAIN_COLUMNS,
    state.columnFilters,
    state.columnSetFilters,
    getActivitySetOptions,
  );

  const display = getActivityDisplayFiltered();
  const total = display.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);

  if (q('activityTotalCount')) q('activityTotalCount').textContent = total;
  if (q('activityPageTotal')) q('activityPageTotal').textContent = `/ ${totalPages}`;
  if (q('activityRangeStart')) q('activityRangeStart').textContent = total > 0 ? (start + 1) : 0;
  if (q('activityRangeEnd')) q('activityRangeEnd').textContent = end;

  renderPageNumberButtons(q('activityPageNumbers'), state.page, totalPages, (p) => {
    state.page = p;
    render();
  });

  const pageSelect = q('activityPageSelect');
  if (pageSelect) {
    pageSelect.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = String(p);
      if (p === state.page) opt.selected = true;
      pageSelect.appendChild(opt);
    }
  }

  renderActivityTable(display.slice(start, end));

  const selected = display.find(a => String(a.id) === String(state.selectedId)) || display[0] || null;
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
  }

  restoreColumnFilterFocus(filterFocus, 'activityTable');
}

function updateActivityPagerAndTable(display) {
  const total = display.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);

  if (q('activityTotalCount')) q('activityTotalCount').textContent = total;
  if (q('activityPageTotal')) q('activityPageTotal').textContent = `/ ${totalPages}`;
  if (q('activityRangeStart')) q('activityRangeStart').textContent = total > 0 ? (start + 1) : 0;
  if (q('activityRangeEnd')) q('activityRangeEnd').textContent = end;

  renderPageNumberButtons(q('activityPageNumbers'), state.page, totalPages, (p) => {
    state.page = p;
    render();
  });

  const pageSelect = q('activityPageSelect');
  if (pageSelect) {
    pageSelect.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = String(p);
      if (p === state.page) opt.selected = true;
      pageSelect.appendChild(opt);
    }
  }

  renderActivityTable(display.slice(start, end));
}

function renderActivityTable(rows) {
  const tbody = q('activityTableBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(a => {
    const sel = String(a.id) === String(state.selectedId);
    return `<tr data-id="${escapeHtml(a.id)}" class="${sel ? 'selected' : ''}">
      <td data-col-key="date"${cellCopy.cellClass('date', a.id, 'activityTable')}>${escapeHtml(a.date)}</td>
      <td data-col-key="time"${cellCopy.cellClass('time', a.id, 'activityTable')}>${escapeHtml(a.time || '')}</td>
      <td data-col-key="rep"${cellCopy.cellClass('rep', a.id, 'activityTable')}>${escapeHtml(a.rep)}</td>
      <td data-col-key="type"${cellCopy.cellClass('type', a.id, 'activityTable')}>${escapeHtml(a.type)}</td>
      <td data-col-key="company"${cellCopy.cellClass('company', a.id, 'activityTable')}>
        <span class="blue-link" data-goto-company data-name="${escapeHtml(a.company || '')}" title="会社一覧で検索">${escapeHtml(a.company)}</span>
      </td>
      <td data-col-key="contact"${cellCopy.cellClass('contact', a.id, 'activityTable')}>
        <span class="blue-link" data-goto-contact data-company="${escapeHtml(a.company || '')}" data-name="${escapeHtml(a.contact || '')}" title="担当一覧で検索">${escapeHtml(a.contact)}</span>
      </td>
      <td data-col-key="comment"${cellCopy.cellClass('comment', a.id, 'activityTable')} title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
    </tr>`;
  }).join('');

  syncResizableTableBody('#activityTable');
}

function fillDetailForm(a) {
  const set = (id, val) => { const el = q(id); if (el) el.value = val ?? ''; };
  set('atDetailId', a.id);
  set('atDetailType', a.type);
  set('atDetailPurpose', a.purpose);
  set('atDetailContact', a.contact);
  set('atDetailSalesRep', a.rep);
  set('atDetailProjectName', a.projectName);
  set('atDetailDate', a.date);
  set('atDetailComment', a.comment);
  set('atDetailCompanyName', a.company);
}

function initResizer() {
  const resizer = q('activity-resizer');
  const container = document.querySelector('#activity-root .company-main');
  if (!resizer || !container) return;

  if (!container.style.getPropertyValue('--grid-height')) {
    container.style.setProperty('--grid-height', '400px');
  }
  try {
    const saved = parseInt(localStorage.getItem('smos.at01.listH') || '', 10);
    if (saved >= 160) container.style.setProperty('--grid-height', `${saved}px`);
  } catch { /* ignore */ }

  let isResizing = false;
  resizer.addEventListener('mousedown', () => {
    isResizing = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    resizer.classList.add('active');
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerRect = container.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    const minGridHeight = 160;
    const maxHeight = Math.min(
      Math.round(window.innerHeight * 0.55),
      Math.max(minGridHeight, relativeY)
    );
    container.style.setProperty('--grid-height', `${maxHeight}px`);
  });
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    resizer.classList.remove('active');
    try {
      const h = parseInt(container.style.getPropertyValue('--grid-height') || '400', 10);
      localStorage.setItem('smos.at01.listH', String(h));
    } catch { /* ignore */ }
  });
}
