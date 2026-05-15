import { q, escapeHtml } from '../../utils/helpers.js';
import { mockActivities } from '../../utils/mockData.js';

let state = {
  activities: [...mockActivities],
  filtered: [...mockActivities],
  selectedId: mockActivities[0]?.id ?? null,
  page: 1,
  pageSize: 25
};

let table = null;

export function init() {
  console.log('Activity screen (AT01) initialized');
  bindUi();
  initTabulator();
  initResizer();

  // Force an initial render after a small delay to ensure everything is ready
  setTimeout(() => {
    render();
  }, 200);
}

function bindUi() {
  q('btnActivitySearch')?.addEventListener('click', () => {
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
  });

  q('btnActivityClear')?.addEventListener('click', () => {
    if (q('activitySearchType')) q('activitySearchType').value = '';
    if (q('activitySearchSalesRep')) q('activitySearchSalesRep').value = '';
    if (q('activitySearchCompany')) q('activitySearchCompany').value = '';
    state.filtered = [...state.activities];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ?? null;
    render();
  });

  q('btnActivityNewMain')?.addEventListener('click', () => {
    q('dlgActivityDetail')?.showModal();
  });

  q('btnActivityAdvancedSearch')?.addEventListener('click', () => {
    q('dlgActivityAdvancedSearch')?.showModal();
  });

  q('btnAtDetailContactLookup')?.addEventListener('click', () => {
    q('dlgContactLookup')?.showModal();
  });

  q('btnAtDetailContactNew')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnAtDetailProjectLookup')?.addEventListener('click', () => {
    q('dlgProjectLookup')?.showModal();
  });

  q('btnAtDetailProjectNew')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });
  
  q('btnAtDetailSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnAtDetailDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  // Pager Events
  q('btnActivityFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnActivityPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnActivityNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnActivityLastPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    state.page = totalPages;
    render();
  });

  q('activityPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value) || 1;
    render();
  });

  q('activityPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value) || 25;
    state.page = 1;
    render();
  });
}

function render() {
  const totalCount = q('activityTotalCount');
  const pageNumbers = q('activityPageNumbers');
  const pageSelect = q('activityPageSelect');
  const pageTotal = q('activityPageTotal');
  const rangeStart = q('activityRangeStart');
  const rangeEnd = q('activityRangeEnd');

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

  const selected = state.activities.find(a => String(a.id) === String(state.selectedId)) || state.filtered[0] || null;
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
  }
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

function initTabulator() {
  const container = q('activityTable');
  if (!container) return;

  if (table) { try { table.destroy(); } catch (e) { } }

  const start = (state.page - 1) * state.pageSize;
  const initialRows = state.filtered.slice(start, start + state.pageSize);

  table = new Tabulator("#activityTable", {
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
      table.deselectRow();
      row.select();
    },
    columns: [
      { title: "活動日", field: "date", width: 110 },
      { title: "開始時刻", field: "time", width: 90 },
      { title: "営業担当", field: "rep", width: 130 },
      { title: "タイプ", field: "type", width: 80, formatter: (cell) => {
          const val = cell.getValue();
          let cls = val === 'TEL' ? 'type-tel' : (val === '訪問' ? 'type-visit' : 'type-mail');
          return `<span class="type-badge ${cls}">${val}</span>`;
        }, htmlOutput: true 
      },
      { title: "会社名", field: "company", width: 250 },
      { title: "担当(姓)", field: "contact", width: 120 },
      { title: "コメント", field: "comment", minWidth: 300 },
    ],
  });
}

function initResizer() {
  const resizer = q('activity-resizer');
  const container = document.querySelector('#activity-root .company-main');
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
