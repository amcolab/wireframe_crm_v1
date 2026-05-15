import { q, escapeHtml } from '../../utils/helpers.js';
import { mockProjects, mockActivities } from '../../utils/mockData.js';

let state = {
  projects: [...mockProjects],
  filtered: [...mockProjects],
  selectedId: mockProjects[0]?.id ? String(mockProjects[0].id) : null,
  page: 1,
  pageSize: 25
};

let table = null;

// Helper to convert YYYY/MM/DD to YYYY-MM-DD for <input type="date">
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/\//g, '-');
}

export function init() {
  console.log('Project screen (PR01) initialized');
  bindUi();
  initTabulator();
  initResizer();

  setTimeout(() => {
    render();
  }, 200);
}

function bindUi() {
  const tabs = document.querySelectorAll('[data-pr-tab]');
  const panels = document.querySelectorAll('[data-pr-panel]');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-pr-tab');
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panels.forEach(p => {
        const isTarget = p.getAttribute('data-pr-panel') === tab;
        p.classList.toggle('active', isTarget);
        p.style.display = isTarget ? 'block' : 'none';
      });

      // Show/Hide tab-specific actions
      const isActivities = tab === 'activities';
      const btnAct = q('btnPrTabNewActivity');
      const btnPrj = q('btnPrTabNewProject');
      if (btnAct) btnAct.style.display = isActivities ? 'block' : 'none';
      if (btnPrj) btnPrj.style.display = isActivities ? 'block' : 'none';

      // Redraw table if switching to activities tab
      if (tab === 'activities' && table) table.redraw();
    });
  });

  q('btnProjectSearch')?.addEventListener('click', () => {
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
  });

  q('btnProjectClear')?.addEventListener('click', () => {
    if (q('projectSearchCompany')) q('projectSearchCompany').value = '';
    if (q('projectSearchSalesRep')) q('projectSearchSalesRep').value = '';
    state.filtered = [...state.projects];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
    render();
  });

  q('btnProjectNewMain')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  q('btnProjectAdvancedSearch')?.addEventListener('click', () => {
    q('dlgProjectAdvancedSearch')?.showModal();
  });

  q('btnPrTabNewActivity')?.addEventListener('click', () => {
    q('dlgActivityDetail')?.showModal();
  });

  q('btnPrTabNewProject')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  q('btnPrDetailContactLookup')?.addEventListener('click', () => {
    q('dlgContactLookup')?.showModal();
  });

  q('btnPrDetailContactNew')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnPrDetailSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnPrDetailDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  // Pager Events
  q('btnProjectFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnProjectPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnProjectNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnProjectLastPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    state.page = totalPages;
    render();
  });

  q('projectPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value) || 1;
    render();
  });

  q('projectPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value) || 25;
    state.page = 1;
    render();
  });
}

function render() {
  const totalCount = q('projectTotalCount');
  const pageNumbers = q('projectPageNumbers');
  const pageSelect = q('projectPageSelect');
  const pageTotal = q('projectPageTotal');
  const rangeStart = q('projectRangeStart');
  const rangeEnd = q('projectRangeEnd');

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  if (totalCount) totalCount.textContent = total;
  if (pageTotal) pageTotal.textContent = `/ ${totalPages}`;

  const start = (state.page - 1) * state.pageSize;
  const actualEndIdx = Math.min(start + state.pageSize, total);

  if (rangeStart) rangeStart.textContent = total > 0 ? (start + 1) : 0;
  if (rangeEnd) rangeEnd.textContent = actualEndIdx;

  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.className = `page-num-btn ${p === state.page ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => { state.page = p; render(); };
      pageNumbers.appendChild(btn);
    }
  }

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

  const rows = state.filtered.slice(start, actualEndIdx);

  if (table) {
    table.setData(rows).then(() => {
      if (state.selectedId) {
        table.deselectRow();
        table.selectRow(state.selectedId);
      }
      table.redraw();
    });
  }

  const selected = state.projects.find(p => String(p.id) === String(state.selectedId)) || state.filtered[0] || null;
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
    const relatedActivities = mockActivities.filter(a => String(a.projectId) === String(selected.id));
    renderActivities(relatedActivities);
  }
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
  
  // Fix date format
  set('prDetailIssueDate', formatDateForInput(p.issueDate));
  set('prDetailFollowUp', formatDateForInput(p.followDate));
  
  // Set checkboxes
  const setChk = (id, val) => { const el = q(id); if (el) el.checked = !!val; };
  setChk('prStage1', p.stage1);
  setChk('prStage2', p.stage2);
  setChk('prStage3', p.stage3);
  setChk('prStage4', p.stage4);
}

function renderActivities(data) {
  const tbody = q('projectActivitiesTableBody');
  if (!tbody) return;
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #999;">関連する活動はありません。</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${escapeHtml(a.date || '-')}</td>
      <td>${escapeHtml(a.rep || '-')}</td>
      <td><span class="type-badge ${a.typeClass || ''}">${escapeHtml(a.type || '-')}</span></td>
      <td>${escapeHtml(a.purpose || '-')}</td>
      <td>${escapeHtml(a.motivation || '-')}</td>
      <td>${escapeHtml(a.contact || '-')}</td>
      <td>${escapeHtml(a.comment || '-')}</td>
    </tr>
  `).join('');
}

function initTabulator() {
  const container = q('projectTable');
  if (!container) return;
  if (table) { try { table.destroy(); } catch (e) { } }
  const start = (state.page - 1) * state.pageSize;
  const initialRows = state.filtered.slice(start, start + state.pageSize);

  table = new Tabulator("#projectTable", {
    data: initialRows,
    layout: "fitColumns",
    movableColumns: true,
    selectableRows: 1,
    headerSort: false,
    clipboard: true,
    rowClick: function (e, row) {
      const data = row.getData();
      state.selectedId = String(data.id);
      fillDetailForm(data);
      const relatedActivities = mockActivities.filter(a => String(a.projectId) === String(data.id));
      renderActivities(relatedActivities);
      table.deselectRow();
      row.select();
    },
    columns: [
      { title: "話題日", field: "issueDate", width: 110 },
      { title: "フォロー予定", field: "followDate", width: 110 },
      { title: "案件ステータス", field: "status", width: 120 },
      { title: "営業担当", field: "rep", width: 130 },
      { title: "会社名", field: "company", width: 250 },
      { title: "担当(姓)", field: "contact", width: 120 },
      { title: "案件名", field: "name", width: 200 },
      { title: "案件概要", field: "summary", width: 300 },
      { title: "発生動機", field: "motivation", width: 100 },
      { title: "引合手段", field: "method", minWidth: 150 },
    ],
  });
}

function initResizer() {
  const resizer = q('project-resizer');
  const container = document.querySelector('#project-root .company-main');
  if (!resizer || !container) return;
  let isResizing = false;
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    resizer.classList.add('active');
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerRect = container.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    const minGridHeight = 150;
    const minDetailHeight = 200;
    const maxHeight = containerRect.height - minDetailHeight;
    let newHeight = relativeY - 6;
    if (newHeight < minGridHeight) newHeight = minGridHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;
    container.style.setProperty('--grid-height', `${newHeight}px`);
    if (table) table.redraw();
  });
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizer.classList.remove('active');
    }
  });
}
