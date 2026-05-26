import { q, escapeHtml } from '../../utils/helpers.js';
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

let state = {
  activities: [...mockActivities],
  filtered: [...mockActivities],
  selectedId: mockActivities[0]?.id ?? null,
  page: 1,
  pageSize: 25,
  advanced: null,
};

let tableBound = false;

export function init() {
  console.log('Activity screen (AT01) initialized');
  bindUi();
  bindActivityTable();
  setupResizableTable('#activityTable', {
    orderKey: 'smos.at01.colOrder',
    widthKey: 'smos.at01.colWidths',
  });
  initResizer();
  const card = document.querySelector('#activity-root .company-detail');
  syncEntityDetailTabLayout(card, 'detail');
  setTimeout(() => render(), 200);
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
    state.filtered = [...state.activities];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ?? null;
    render();
  });
  q('btnActivityNewMain')?.addEventListener('click', () => { q('dlgActivityDetail')?.showModal(); });
  q('btnAtDetailContactLookup')?.addEventListener('click', () => { q('dlgContactLookup')?.showModal(); });
  q('btnAtDetailContactNew')?.addEventListener('click', () => { q('dlgContactDetailNew')?.showModal(); });
  q('btnAtDetailProjectLookup')?.addEventListener('click', () => { q('dlgProjectLookup')?.showModal(); });
  q('btnAtDetailProjectNew')?.addEventListener('click', () => { q('dlgProjectDetail')?.showModal(); });
  q('btnAtDetailSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnAtDetailDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  q('btnActivityFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnActivityPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnActivityNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnActivityLastPage')?.addEventListener('click', () => {
    state.page = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    render();
  });
  q('activityPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value, 10) || 1;
    render();
  });
  q('activityPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10) || 25;
    state.page = 1;
    render();
  });
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
  if (!tbody || tableBound) return;
  tableBound = true;
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    const a = getSelectedActivity();
    if (a) fillDetailForm(a);
    render();
  });
}

function render() {
  syncSearchFiltersIndicator(q('btnActivityAdvancedSearch'), state.advanced);

  const total = state.filtered.length;
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

  renderActivityTable(state.filtered.slice(start, end));

  const selected = getSelectedActivity();
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
  }
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
      <td data-col-key="date">${escapeHtml(a.date)}</td>
      <td data-col-key="time">${escapeHtml(a.time || '')}</td>
      <td data-col-key="rep">${escapeHtml(a.rep)}</td>
      <td data-col-key="type"><span class="${escapeHtml(a.typeClass || '')}">${escapeHtml(a.type)}</span></td>
      <td data-col-key="company">${escapeHtml(a.company)}</td>
      <td data-col-key="contact" class="blue-link">${escapeHtml(a.contact)}</td>
      <td data-col-key="comment" title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
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
