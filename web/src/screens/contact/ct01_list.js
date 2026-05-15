import { q, escapeHtml } from '../../utils/helpers.js';
import { mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';

let state = {
  contacts: [...mockContacts],
  filtered: [...mockContacts],
  selectedId: mockContacts[0]?.id ? String(mockContacts[0].id) : null,
  page: 1,
  pageSize: 25
};

let table = null;

export function init() {
  console.log('Contact screen (CT01) initialized');
  bindUi();
  initTabulator();
  initResizer();

  // Force an initial render after a small delay to ensure everything is ready
  setTimeout(() => {
    render();
  }, 200);
}

function bindUi() {
  const tabs = document.querySelectorAll('[data-contact-tab]');
  const panels = document.querySelectorAll('[data-contact-panel]');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-contact-tab');
      tabs.forEach(x => x.classList.toggle('active', x === t));
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-contact-panel') === tab));

      const btnNewActivity = q('btnContactNewActivity');
      const btnNewProject = q('btnContactNewProject');
      if (btnNewActivity) btnNewActivity.style.display = tab === 'activities' ? 'block' : 'none';
      if (btnNewProject) btnNewProject.style.display = tab === 'projects' ? 'block' : 'none';
    });
  });

  q('btnContactNewActivity')?.addEventListener('click', () => { q('dlgActivityDetail')?.showModal(); });
  q('btnContactCreateMain')?.addEventListener('click', () => { q('dlgContactDetailNew')?.showModal(); });
  q('btnContactNewProject')?.addEventListener('click', () => { q('dlgProjectDetail')?.showModal(); });
  q('btnContactAdvancedSearch')?.addEventListener('click', () => { q('dlgContactAdvancedSearch')?.showModal(); });
  q('btnMainContactLookupCompany')?.addEventListener('click', () => { q('dlgCompanyLookup')?.showModal(); });
  q('btnMainContactCreateCompany')?.addEventListener('click', () => { q('dlgCompanyCreate')?.showModal(); });
  q('btnContactSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnContactDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  q('btnContactSearch')?.addEventListener('click', () => {
    const name = q('contactSearchName')?.value?.trim();
    const company = q('contactSearchCompany')?.value?.trim();
    state.filtered = state.contacts.filter(c => {
      if (name && !((c.last || '') + (c.first || '')).includes(name)) return false;
      if (company && !(c.company || '').includes(company)) return false;
      return true;
    });
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
    render();
  });

  q('btnContactClear')?.addEventListener('click', () => {
    if (q('contactSearchName')) q('contactSearchName').value = '';
    if (q('contactSearchCompany')) q('contactSearchCompany').value = '';
    state.filtered = [...state.contacts];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
    render();
  });

  // Pager Events
  q('btnContactFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnContactPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnContactNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnContactLastPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    state.page = totalPages;
    render();
  });

  q('contactPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value) || 1;
    render();
  });

  q('contactPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value) || 25;
    state.page = 1;
    render();
  });
}

function render() {
  const totalCount = q('contactTotalCount');
  const pageNumbers = q('contactPageNumbers');
  const pageSelect = q('contactPageSelect');
  const pageTotal = q('contactPageTotal');
  const rangeStart = q('contactRangeStart');
  const rangeEnd = q('contactRangeEnd');

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
      table.redraw(); // Ensure correct width
    });
  }

  const selected = state.contacts.find(c => String(c.id) === String(state.selectedId)) || state.filtered[0] || null;
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
    renderActivities(mockActivities.filter(a => String(a.contactId) === String(selected.id)));
    renderProjects(mockProjects.filter(p => String(p.contactId) === String(selected.id)));
  }
}

function fillDetailForm(c) {
  // Mapping based on the HTML IDs in ct01_list.html
  // Need to find the correct IDs. Looking at HTML:
  // The HTML has inputs without IDs in some places, but let's use the ones I can find
  const inputs = document.querySelectorAll('#contact-panel-detail input, #contact-panel-detail select, #contact-panel-detail textarea');
  // For simplicity in this wireframe, I'll just fill the first few fields I know exist
  const idEl = document.querySelector('#contact-panel-detail input[disabled]');
  if (idEl) idEl.value = c.id || '';

  // Actually, let's use the specific selectors from the HTML
  const setVal = (selector, val) => { const el = document.querySelector(selector); if (el) el.value = val ?? ''; };

  setVal('#contact-root input[value="石井"]', c.last);
  setVal('#contact-root input[value="智也"]', c.first);
  setVal('#mainContactCompanyName', c.company);
}

function renderActivities(data) {
  const tbody = q('contactActivitiesBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${escapeHtml(a.date || '-')}</td>
      <td>${escapeHtml(a.rep || '-')}</td>
      <td><span class="type-badge ${a.typeClass || ''}">${escapeHtml(a.type || '-')}</span></td>
      <td>${escapeHtml(a.comment || '-')}</td>
      <td>${escapeHtml(a.purpose || '-')}</td>
    </tr>
  `).join('');
}

function renderProjects(data) {
  const tbody = q('contactProjectsBody');
  if (!tbody) return;
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.issueDate || '-')}</td>
      <td>${escapeHtml(p.saleDate || '-')}</td>
      <td><span class="status-badge ${p.status === '受注' ? 'status-won' : 'status-lost'}">${escapeHtml(p.status || '-')}</span></td>
      <td>${escapeHtml(p.rep || '-')}</td>
      <td>${escapeHtml(p.name || '-')}</td>
      <td>${escapeHtml(p.contact || '-')}</td>
      <td>${escapeHtml(p.summary || '-')}</td>
      <td>${escapeHtml(p.initial || '-')}</td>
      <td>${escapeHtml(p.motivation || '-')}</td>
      <td>${escapeHtml(p.method || '-')}</td>
    </tr>
  `).join('');
}

function initTabulator() {
  const container = q('contactTable');
  if (!container) return;
  if (table) { try { table.destroy(); } catch (e) { } }
  const start = (state.page - 1) * state.pageSize;
  const initialRows = state.filtered.slice(start, start + state.pageSize);

  table = new Tabulator("#contactTable", {
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
      renderActivities(mockActivities.filter(a => String(a.contactId) === String(data.id)));
      renderProjects(mockProjects.filter(p => String(p.contactId) === String(data.id)));
      table.deselectRow();
      row.select();
    },
    columns: [
      { title: "会社ID", field: "companyId", width: 80 },
      { title: "会社名", field: "company", width: 200 },
      { title: "部署名", field: "dept", width: 150 },
      { title: "担当(姓)", field: "last", width: 90 },
      { title: "担当(名)", field: "first", width: 90 },
      { title: "フリガナ", field: "kana", width: 100 },
      { title: "TEL", field: "tel", width: 110 },
      { title: "携帯電話", field: "mobile", width: 110 },
      { title: "Email", field: "email", width: 150 },
      { title: "職種", field: "role", width: 100 },
      { title: "職位", field: "rank", width: 100 },
      { title: "役職名", field: "pos", width: 100 },
      { title: "住所", field: "addr", minWidth: 200 },
    ],
  });
}

function initResizer() {
  const resizer = q('contact-resizer');
  const container = document.querySelector('#contact-root .company-main');
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
