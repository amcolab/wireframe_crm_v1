import { q, escapeHtml } from '../../utils/helpers.js';
import { mockProjects, mockActivities } from '../../utils/mockData.js';
import { renderPageNumberButtons } from '../../utils/pager.js';
import {
  bindAdvancedSearchForm,
  clearAdvancedSearch,
  hasSearchConditions,
  syncSearchFiltersIndicator,
} from '../../utils/searchFilters.js';
import { openContactCreateDialog } from '../../utils/contactCreateForm.js';
import { openActivityCreateDialog } from '../../utils/activityCreateForm.js';
import { openProjectCreateDialog } from '../../utils/projectCreateForm.js';
import {
  TAB_EMPTY,
  renderTabEmptyState,
  showTabPager,
  updateTabPager,
  bindTabPager,
  syncEntityDetailTabLayout,
} from '../../utils/entityTabTable.js';
import {
  setupResizableTable,
  syncResizableTableBody,
  buildColgroup,
  buildTheadRow,
} from '../../utils/tableColumns.js';
import { takePendingProjectSearch, bindCrossScreenLinks } from '../../utils/screenNavigation.js';
import { createTableCellCopy } from '../../utils/tableCellCopy.js';

let state = {
  projects: [...mockProjects],
  filtered: [...mockProjects],
  selectedId: mockProjects[0]?.id ? String(mockProjects[0].id) : null,
  page: 1,
  pageSize: 25,
  advanced: null,
  projectActivitiesPage: 1,
  projectActivitiesPageSize: 10,
};

let tableBound = false;
let contextMenuBound = false;

const cellCopy = createTableCellCopy({ scopeSelector: '#project-root', useToast: false });

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/\//g, '-');
}

export function init() {
  console.log('Project screen (PR01) initialized');
  bindUi();
  bindProjectTable();
  setupResizableTable('#projectTable', {
    orderKey: 'smos.pr01.colOrder',
    widthKey: 'smos.pr01.colWidths',
  });
  bindTabPager(
    'projectActivities',
    state,
    'projectActivitiesPage',
    'projectActivitiesPageSize',
    () => getSelectedProjectActivities(),
    () => {
      const p = getSelectedProject();
      if (p) renderProjectActivitiesList(p);
    }
  );
  initResizer();
  const card = document.querySelector('#project-root .company-detail');
  syncEntityDetailTabLayout(card, 'detail');
  applyPendingProjectSearch();
  bindCrossScreenLinks(q('project-root'));
  setTimeout(() => render(), 200);
}

function applyPendingProjectSearch() {
  const pending = takePendingProjectSearch();
  if (!pending) return;
  if (q('projectSearchCompany')) q('projectSearchCompany').value = pending.company || '';
  if (q('projectSearchSalesRep')) q('projectSearchSalesRep').value = pending.rep || '';
  applySearch();
  if (pending.name) {
    const hit = state.filtered.find((p) => String(p.name || '') === String(pending.name));
    if (hit) {
      state.selectedId = String(hit.id);
      render();
    }
  }
}

function getSelectedProject() {
  return state.projects.find(p => String(p.id) === String(state.selectedId))
    || state.filtered.find(p => String(p.id) === String(state.selectedId))
    || state.filtered[0]
    || null;
}

function getSelectedProjectActivities() {
  const p = getSelectedProject();
  if (!p) return [];
  return mockActivities.filter(a => String(a.projectId) === String(p.id));
}

function bindUi() {
  const root = q('project-root');
  if (root?.dataset.bound) return;
  root.dataset.bound = 'true';

  const tabs = document.querySelectorAll('[data-pr-tab]');
  const panels = document.querySelectorAll('[data-pr-panel]');
  const card = document.querySelector('#project-root .company-detail');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-pr-tab');
      tabs.forEach(x => {
        x.classList.toggle('active', x === t);
        x.setAttribute('aria-selected', x === t ? 'true' : 'false');
      });
      panels.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-pr-panel') === tab);
      });
      syncEntityDetailTabLayout(card, tab);

      const btnAct = q('btnPrTabNewActivity');
      if (btnAct) btnAct.style.display = tab === 'activities' ? 'inline-flex' : 'none';
    });
  });

  const btnProjectAdv = q('btnProjectAdvancedSearch');
  bindAdvancedSearchForm({
    btn: btnProjectAdv,
    dlg: q('dlgProjectAdvancedSearch'),
    form: q('formProjectAdvancedSearch'),
    state,
    onApply: applySearch,
  });

  const onProjectBasicInput = () => {
    if (!hasProjectBasicSearch() && !hasSearchConditions(state.advanced)) {
      syncSearchFiltersIndicator(btnProjectAdv, null);
    }
  };
  ['projectSearchStatus', 'projectSearchSalesRep', 'projectSearchCompany', 'projectSearchDateFrom', 'projectSearchDateTo']
    .forEach((id) => q(id)?.addEventListener('input', onProjectBasicInput));
  q('projectSearchStatus')?.addEventListener('change', onProjectBasicInput);

  q('btnProjectSearch')?.addEventListener('click', applySearch);
  q('btnProjectClear')?.addEventListener('click', () => {
    if (q('projectSearchStatus')) q('projectSearchStatus').value = '';
    if (q('projectSearchCompany')) q('projectSearchCompany').value = '';
    if (q('projectSearchSalesRep')) q('projectSearchSalesRep').value = '';
    if (q('projectSearchDateFrom')) q('projectSearchDateFrom').value = '';
    if (q('projectSearchDateTo')) q('projectSearchDateTo').value = '';
    clearAdvancedSearch({
      btn: btnProjectAdv,
      form: q('formProjectAdvancedSearch'),
      state,
    });
    state.filtered = [...state.projects];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
    render();
  });
  q('btnProjectNewMain')?.addEventListener('click', () => { openProjectCreateDialog(); });
  q('btnPrTabNewActivity')?.addEventListener('click', () => { openActivityCreateDialog(); });
  q('btnPrDetailContactLookup')?.addEventListener('click', () => { q('dlgContactLookup')?.showModal(); });
  q('btnPrDetailContactNew')?.addEventListener('click', () => { openContactCreateDialog(); });
  q('btnPrDetailSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnPrDetailDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  q('btnProjectFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnProjectPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnProjectNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnProjectLastPage')?.addEventListener('click', () => {
    state.page = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    render();
  });
  q('projectPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value, 10) || 1;
    render();
  });
  q('projectPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10) || 25;
    state.page = 1;
    render();
  });

  bindProjectContextMenu();
}

function getProjectContextMenu() {
  return q('projectContextMenu');
}

function hideProjectContextMenu() {
  const menu = getProjectContextMenu();
  if (!menu) return;
  menu.style.display = 'none';
  menu.setAttribute('aria-hidden', 'true');
}

function showProjectContextMenu(x, y) {
  const menu = getProjectContextMenu();
  if (!menu) return;
  menu.style.visibility = 'hidden';
  menu.style.display = 'block';
  menu.setAttribute('aria-hidden', 'false');
  const rect = menu.getBoundingClientRect();
  const left = Math.min(Math.max(0, x), Math.max(0, window.innerWidth - rect.width - 4));
  const top = Math.min(Math.max(0, y), Math.max(0, window.innerHeight - rect.height - 4));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = '';
}

function bindProjectContextTarget(selector) {
  cellCopy.bindTableTarget(selector, {
    onClick: selector === 'projectTable' ? false : undefined,
    onContextMenu: ({ x, y }) => showProjectContextMenu(x, y),
  });
}

function bindProjectContextMenu() {
  if (contextMenuBound) return;
  contextMenuBound = true;
  bindProjectContextTarget('projectTable');
  bindProjectContextTarget('projectActivitiesList');
  const menu = getProjectContextMenu();
  if (!menu) return;

  menu.addEventListener('click', async (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item || item.classList.contains('disabled')) return;
    const action = item.getAttribute('data-action');

    if (action === 'copy') {
      await cellCopy.copyCellText();
    } else if (action === 'new-activity') {
      q('btnPrTabNewActivity')?.click();
    } else if (action === 'new-project') {
      q('btnProjectNewMain')?.click();
    }

    hideProjectContextMenu();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#projectContextMenu')) return;
    hideProjectContextMenu();
  });
  window.addEventListener('resize', hideProjectContextMenu);
  window.addEventListener('scroll', hideProjectContextMenu, true);
  cellCopy.bindKeyboardCopy(() => !!q('project-root'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideProjectContextMenu();
  });
}

function hasProjectBasicSearch() {
  return !!(
    q('projectSearchStatus')?.value
    || q('projectSearchSalesRep')?.value?.trim()
    || q('projectSearchCompany')?.value?.trim()
    || q('projectSearchDateFrom')?.value
    || q('projectSearchDateTo')?.value
  );
}

function applySearch() {
  const company = q('projectSearchCompany')?.value?.trim();
  const rep = q('projectSearchSalesRep')?.value?.trim();
  state.filtered = state.projects.filter(p => {
    if (company && !(p.company || '').includes(company)) return false;
    if (rep && !(p.rep || '').includes(rep)) return false;
    return true;
  });
  state.page = 1;
  state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
  render();
}

function bindProjectTable() {
  const tbody = q('projectTableBody');
  if (!tbody || tableBound) return;
  tableBound = true;
  tbody.addEventListener('click', (e) => {
    if (e.target.closest('[data-goto-company], [data-goto-contact], [data-goto-activity], [data-goto-project]')) {
      return;
    }
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    cellCopy.setSelectedCell(tr, e.target.closest('td'), q('projectTable'));
    const p = getSelectedProject();
    if (p) {
      state.selectedId = String(p.id);
      fillDetailForm(p);
      state.projectActivitiesPage = 1;
      renderProjectActivitiesList(p);
    }
    render();
  });
}

function render() {
  syncSearchFiltersIndicator(q('btnProjectAdvancedSearch'), state.advanced);

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);

  if (q('projectTotalCount')) q('projectTotalCount').textContent = total;
  if (q('projectPageTotal')) q('projectPageTotal').textContent = `/ ${totalPages}`;
  if (q('projectRangeStart')) q('projectRangeStart').textContent = total > 0 ? (start + 1) : 0;
  if (q('projectRangeEnd')) q('projectRangeEnd').textContent = end;

  renderPageNumberButtons(q('projectPageNumbers'), state.page, totalPages, (p) => {
    state.page = p;
    render();
  });

  const pageSelect = q('projectPageSelect');
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

  renderProjectTable(state.filtered.slice(start, end));

  const selected = getSelectedProject();
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
    renderProjectActivitiesList(selected);
  }
}

function renderProjectTable(rows) {
  const tbody = q('projectTableBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(p => {
    const sel = String(p.id) === String(state.selectedId);
    return `<tr data-id="${escapeHtml(p.id)}" class="${sel ? 'selected' : ''}">
      <td data-col-key="issueDate"${cellCopy.cellClass('issueDate', p.id, 'projectTable')}>${escapeHtml(p.issueDate || '')}</td>
      <td data-col-key="followDate"${cellCopy.cellClass('followDate', p.id, 'projectTable')}>${escapeHtml(p.followDate || '')}</td>
      <td data-col-key="status"${cellCopy.cellClass('status', p.id, 'projectTable')}>${escapeHtml(p.status || '')}</td>
      <td data-col-key="rep"${cellCopy.cellClass('rep', p.id, 'projectTable')}>${escapeHtml(p.rep || '')}</td>
      <td data-col-key="company"${cellCopy.cellClass('company', p.id, 'projectTable')}>
        <span class="blue-link" data-goto-company data-name="${escapeHtml(p.company || '')}" title="会社一覧で検索">${escapeHtml(p.company || '')}</span>
      </td>
      <td data-col-key="contact"${cellCopy.cellClass('contact', p.id, 'projectTable')}>
        <span class="blue-link" data-goto-contact data-company="${escapeHtml(p.company || '')}" data-name="${escapeHtml(p.contact || '')}" title="担当一覧で検索">${escapeHtml(p.contact || '')}</span>
      </td>
      <td data-col-key="name"${cellCopy.cellClass('name', p.id, 'projectTable')}>${escapeHtml(p.name || '')}</td>
      <td data-col-key="summary"${cellCopy.cellClass('summary', p.id, 'projectTable')} title="${escapeHtml(p.summary || '')}">${escapeHtml(p.summary || '')}</td>
      <td data-col-key="motivation"${cellCopy.cellClass('motivation', p.id, 'projectTable')}>${escapeHtml(p.motivation || '')}</td>
    </tr>`;
  }).join('');

  syncResizableTableBody('#projectTable');
}

function fillDetailForm(p) {
  const set = (id, val) => { const el = q(id); if (el) el.value = val ?? ''; };
  set('prDetailId', p.id);
  set('prDetailName', p.name);
  set('prDetailStatus', p.status);
  set('prDetailSalesRep', p.rep);
  set('prDetailCompanyName', p.company);
  set('prDetailContact', p.contact);
  set('prDetailSummary', p.summary);
  set('prDetailIssueDate', formatDateForInput(p.issueDate));
  set('prDetailFollowUp', formatDateForInput(p.followDate));
  const setChk = (id, val) => { const el = q(id); if (el) el.checked = !!val; };
  setChk('prStage1', p.stage1);
  setChk('prStage2', p.stage2);
  setChk('prStage3', p.stage3);
  setChk('prStage4', p.stage4);
}

function renderProjectActivitiesList(p) {
  const wrap = q('projectActivitiesList');
  const pager = q('projectActivitiesPager');
  if (!wrap) return;

  const items = mockActivities.filter(a => String(a.projectId) === String(p.id));
  const total = items.length;

  if (total === 0) {
    renderTabEmptyState(wrap, pager, TAB_EMPTY.projectActivities);
    return;
  }
  showTabPager(pager);

  const size = state.projectActivitiesPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (state.projectActivitiesPage > totalPages) state.projectActivitiesPage = totalPages;
  if (state.projectActivitiesPage < 1) state.projectActivitiesPage = 1;

  const start = (state.projectActivitiesPage - 1) * size;
  const sliced = items.slice(start, Math.min(start + size, total));

  const actCols = [
    { key: 'date', label: '活動日', width: 100 },
    { key: 'rep', label: '営業担当', width: 120 },
    { key: 'type', label: 'タイプ', width: 90 },
    { key: 'purpose', label: '目的', width: 120 },
    { key: 'motivation', label: '動機', width: 100 },
    { key: 'contact', label: '担当(姓)', width: 100 },
    { key: 'comment', label: 'コメント', width: 200 },
  ];
  let html = `<table class="t" id="projectActivitiesTable">${buildColgroup(actCols)}${buildTheadRow(actCols)}<tbody>`;

  if (!sliced.length) {
    html += '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
  } else {
    html += sliced.map(a => `<tr data-id="${escapeHtml(a.id)}">
      <td data-col-key="date"${cellCopy.cellClass('date', a.id, 'projectActivitiesList')}>${escapeHtml(a.date || '-')}</td>
      <td data-col-key="rep"${cellCopy.cellClass('rep', a.id, 'projectActivitiesList')}>${escapeHtml(a.rep || '-')}</td>
      <td data-col-key="type"${cellCopy.cellClass('type', a.id, 'projectActivitiesList')}>
        <span class="${escapeHtml(a.typeClass || '')} blue-link" data-goto-contact data-company="${escapeHtml(p.company || a.company || '')}" data-name="${escapeHtml(a.contact || '')}" title="担当一覧で検索">${escapeHtml(a.type || '-')}</span>
      </td>
      <td data-col-key="purpose"${cellCopy.cellClass('purpose', a.id, 'projectActivitiesList')}>${escapeHtml(a.purpose || '-')}</td>
      <td data-col-key="motivation"${cellCopy.cellClass('motivation', a.id, 'projectActivitiesList')}>${escapeHtml(a.motivation || '-')}</td>
      <td data-col-key="contact"${cellCopy.cellClass('contact', a.id, 'projectActivitiesList')}>
        <span class="blue-link" data-goto-activity data-company="${escapeHtml(p.company || a.company || '')}" data-contact="${escapeHtml(a.contact || '')}" data-type="${escapeHtml(a.type || '')}" title="活動一覧で検索">${escapeHtml(a.contact || '-')}</span>
      </td>
      <td data-col-key="comment"${cellCopy.cellClass('comment', a.id, 'projectActivitiesList')} title="${escapeHtml(a.comment || '')}">${escapeHtml(a.comment || '')}</td>
    </tr>`).join('');
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
  const actTable = wrap.querySelector('#projectActivitiesTable');
  setupResizableTable(actTable, {
    orderKey: 'smos.pr01.projectActivities.colOrder',
    widthKey: 'smos.pr01.projectActivities.colWidths',
  });
  syncResizableTableBody(actTable);

  updateTabPager('projectActivities', {
    total,
    page: state.projectActivitiesPage,
    pageSize: size,
  }, (pg) => {
    state.projectActivitiesPage = pg;
    renderProjectActivitiesList(p);
  });
}

function initResizer() {
  const resizer = q('project-resizer');
  const container = document.querySelector('#project-root .company-main');
  if (!resizer || !container) return;

  if (!container.style.getPropertyValue('--grid-height')) {
    container.style.setProperty('--grid-height', '400px');
  }
  try {
    const saved = parseInt(localStorage.getItem('smos.pr01.listH') || '', 10);
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
      localStorage.setItem('smos.pr01.listH', String(h));
    } catch { /* ignore */ }
  });
}
