import { q, escapeHtml } from '../../utils/helpers.js';
import { mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';
import { renderPageNumberButtons } from '../../utils/pager.js';
import { saleOptions, typeSaleOptions } from '../../utils/contants.js';
import {
  bindAdvancedSearchForm,
  clearAdvancedSearch,
  hasSearchConditions,
  syncSearchFiltersIndicator,
} from '../../utils/searchFilters.js';
import {
  TAB_EMPTY,
  renderTabEmptyState,
  showTabPager,
  updateTabPager,
  bindTabPager,
  syncEntityDetailTabLayout,
} from '../../utils/entityTabTable.js';
import { takePendingContactSearch } from '../../utils/screenNavigation.js';
import {
  setupResizableTable,
  syncResizableTableBody,
  buildColgroup,
  buildTheadRow,
} from '../../utils/tableColumns.js';
import { openContactCreateDialog, resolveCompanyFromContact } from '../../utils/contactCreateForm.js';

let state = {
  contacts: [...mockContacts],
  filtered: [...mockContacts],
  selectedId: mockContacts[0]?.id ? String(mockContacts[0].id) : null,
  page: 1,
  pageSize: 25,
  advanced: null,
  contactActivitiesPage: 1,
  contactActivitiesPageSize: 10,
  contactProjectsPage: 1,
  contactProjectsPageSize: 10,
};

let tableBound = false;

export function init() {
  console.log('Contact screen (CT01) initialized');
  bindUi();
  bindContactTable();
  bindTabPager(
    'contactActivities',
    state,
    'contactActivitiesPage',
    'contactActivitiesPageSize',
    () => getSelectedContactActivities(),
    () => {
      const c = getSelectedContact();
      if (c) renderContactActivitiesList(c);
    }
  );
  bindTabPager(
    'contactProjects',
    state,
    'contactProjectsPage',
    'contactProjectsPageSize',
    () => getSelectedContactProjects(),
    () => {
      const c = getSelectedContact();
      if (c) renderContactProjectsList(c);
    }
  );
  setupResizableTable('#contactTable', {
    orderKey: 'smos.ct01.colOrder',
    widthKey: 'smos.ct01.colWidths',
  });
  initResizer();
  const card = document.querySelector('#contact-root .company-detail');
  syncEntityDetailTabLayout(card, 'detail');
  applyPendingContactSearch();
  setTimeout(() => render(), 200);
}

function applyPendingContactSearch() {
  const pending = takePendingContactSearch();
  if (!pending) return;

  const companyInput = q('contactSearchCompany');
  const nameInput = q('contactSearchName');
  if (companyInput) companyInput.value = pending.company;
  if (pending.name && nameInput) nameInput.value = pending.name;
  applySearch();
}

function getSelectedContact() {
  return state.contacts.find(c => String(c.id) === String(state.selectedId))
    || state.filtered.find(c => String(c.id) === String(state.selectedId))
    || state.filtered[0]
    || null;
}

function getSelectedContactActivities() {
  const c = getSelectedContact();
  if (!c) return [];
  return mockActivities.filter(a => String(a.contactId) === String(c.id));
}

function getSelectedContactProjects() {
  const c = getSelectedContact();
  if (!c) return [];
  return mockProjects.filter(p => String(p.contactId) === String(c.id));
}

function bindUi() {
  const root = q('contact-root');
  if (root?.dataset.bound) return;
  root.dataset.bound = 'true';

  const tabs = document.querySelectorAll('[data-contact-tab]');
  const panels = document.querySelectorAll('[data-contact-panel]');
  const card = document.querySelector('#contact-root .company-detail');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-contact-tab');
      tabs.forEach(x => {
        x.classList.toggle('active', x === t);
        x.setAttribute('aria-selected', x === t ? 'true' : 'false');
      });
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-contact-panel') === tab));
      syncEntityDetailTabLayout(card, tab);

      const btnNewActivity = q('btnContactNewActivity');
      const btnNewProject = q('btnContactNewProject');
      if (btnNewActivity) btnNewActivity.style.display = tab === 'activities' ? 'inline-flex' : 'none';
      if (btnNewProject) btnNewProject.style.display = tab === 'projects' ? 'inline-flex' : 'none';
    });
  });

  q('btnContactNewActivity')?.addEventListener('click', () => {
    const c = getSelectedContact();
    if (!c) {
      alert('担当者を選択してください。');
      return;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}/${mm}/${dd}`;

    const defaultRep = saleOptions[0]?.label || '高橋健二';
    const defaultTypeOpt = typeSaleOptions.find(opt => opt.value === 2) || { label: 'TEL' };
    const defaultType = defaultTypeOpt.label;

    const newAct = {
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      contactId: String(c.id),
      projectId: '',
      date: formattedDate,
      time: '12:00',
      rep: defaultRep,
      type: defaultType,
      typeClass: 'type-tel',
      purpose: '',
      company: c.company || '',
      contact: c.last || '',
      comment: '',
      projectName: ''
    };

    mockActivities.unshift(newAct);
    state.contactActivitiesPage = 1;
    renderContactActivitiesList(c);
  });
  q('btnContactCreateMain')?.addEventListener('click', () => {
    const selected = getSelectedContact();
    const company = resolveCompanyFromContact(selected);
    openContactCreateDialog({
      company,
      fillExt: false,
      fillAudit: false,
      dept: selected?.dept ?? null,
    });
  });
  q('btnContactNewProject')?.addEventListener('click', () => { q('dlgProjectDetail')?.showModal(); });
  const btnContactAdv = q('btnContactAdvancedSearch');
  bindAdvancedSearchForm({
    btn: btnContactAdv,
    dlg: q('dlgContactAdvancedSearch'),
    form: q('formContactAdvancedSearch'),
    state,
    onApply: applySearch,
  });

  const onContactBasicInput = () => {
    if (!hasContactBasicSearch() && !hasSearchConditions(state.advanced)) {
      syncSearchFiltersIndicator(btnContactAdv, null);
    }
  };
  q('contactSearchName')?.addEventListener('input', onContactBasicInput);
  q('contactSearchCompany')?.addEventListener('input', onContactBasicInput);

  q('btnMainContactLookupCompany')?.addEventListener('click', () => { q('dlgCompanyLookup')?.showModal(); });
  q('btnMainContactCreateCompany')?.addEventListener('click', () => { q('dlgCompanyCreate')?.showModal(); });
  q('btnContactSave')?.addEventListener('click', () => { alert('保存しました'); });
  q('btnContactDelete')?.addEventListener('click', () => { if (confirm('削除しますか？')) alert('削除しました'); });

  q('btnContactSearch')?.addEventListener('click', applySearch);
  q('btnContactClear')?.addEventListener('click', () => {
    if (q('contactSearchName')) q('contactSearchName').value = '';
    if (q('contactSearchCompany')) q('contactSearchCompany').value = '';
    clearAdvancedSearch({
      btn: btnContactAdv,
      form: q('formContactAdvancedSearch'),
      state,
    });
    state.filtered = [...state.contacts];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
    render();
  });

  q('btnContactFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnContactPrevPage')?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  q('btnContactNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnContactLastPage')?.addEventListener('click', () => {
    state.page = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    render();
  });
  q('contactPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value, 10) || 1;
    render();
  });
  q('contactPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10) || 25;
    state.page = 1;
    render();
  });

  const activitiesList = q('contactActivitiesList');
  if (activitiesList) {
    activitiesList.addEventListener('dblclick', (e) => {
      const td = e.target.closest('td[data-col-key]');
      if (!td) return;
      const tr = td.closest('tr[data-id]');
      if (!tr) return;

      if (td.querySelector('input') || td.querySelector('select')) return;

      startCellEditing(td, tr);
    });

    activitiesList.addEventListener('contextmenu', (e) => {
      const td = e.target.closest('td[data-col-key]');
      if (!td) return;
      const tr = td.closest('tr[data-id]');
      if (!tr) return;

      e.preventDefault();

      const menu = q('activitiesContextMenu');
      if (!menu) return;

      menu.style.display = 'block';
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;

      // Store cell context for menu actions
      menu.dataset.clickedCellText = td.textContent.trim();
      menu.dataset.clickedActId = tr.getAttribute('data-id');
    });
  }

  const contextMenu = q('activitiesContextMenu');
  if (contextMenu) {
    contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item || item.classList.contains('disabled')) return;

      const action = item.getAttribute('data-action');
      const cellText = contextMenu.dataset.clickedCellText || '';
      const actId = contextMenu.dataset.clickedActId || '';

      if (action === 'copy') {
        navigator.clipboard.writeText(cellText).then(() => {
          console.log('Copied to clipboard:', cellText);
        }).catch(() => {
          const textArea = document.createElement("textarea");
          textArea.value = cellText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        });
      } else if (action === 'new-activity') {
        q('btnContactNewActivity')?.click();
      } else if (action === 'new-project') {
        // Trigger btnContactCreateMain first (per L26-L31) or btnContactNewProject based on what is correct
        q('btnContactCreateMain')?.click() || q('btnContactNewProject')?.click();
      } else if (action === 'delete-row') {
        const c = getSelectedContact();
        if (c && actId) {
          const index = mockActivities.findIndex(a => String(a.id) === String(actId));
          if (index !== -1) {
            mockActivities.splice(index, 1);
            renderContactActivitiesList(c);
          }
        }
      }

      contextMenu.style.display = 'none';
    });
  }

  // Hide context menu when clicking outside of it
  document.addEventListener('click', () => {
    const menu = q('activitiesContextMenu');
    if (menu) menu.style.display = 'none';
  });
}

function hasContactBasicSearch() {
  return !!(
    q('contactSearchName')?.value?.trim()
    || q('contactSearchCompany')?.value?.trim()
  );
}

function applySearch() {
  const name = q('contactSearchName')?.value?.trim();
  const company = q('contactSearchCompany')?.value?.trim();
  state.filtered = state.contacts.filter(c => {
    if (name && !(`${c.last || ''}${c.first || ''}`).includes(name)) return false;
    if (company && !(c.company || '').includes(company)) return false;
    return true;
  });
  state.page = 1;
  state.selectedId = state.filtered[0]?.id ? String(state.filtered[0].id) : null;
  render();
}

function bindContactTable() {
  const tbody = q('contactTableBody');
  if (!tbody || tableBound) return;
  tableBound = true;
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    const c = getSelectedContact();
    if (c) {
      state.selectedId = String(c.id);
      fillDetailForm(c);
      renderChildLists(c);
    }
    render();
  });
}

function render() {
  syncSearchFiltersIndicator(q('btnContactAdvancedSearch'), state.advanced);

  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);

  if (q('contactTotalCount')) q('contactTotalCount').textContent = total;
  if (q('contactPageTotal')) q('contactPageTotal').textContent = `/ ${totalPages}`;
  if (q('contactRangeStart')) q('contactRangeStart').textContent = total > 0 ? (start + 1) : 0;
  if (q('contactRangeEnd')) q('contactRangeEnd').textContent = end;

  renderPageNumberButtons(q('contactPageNumbers'), state.page, totalPages, (p) => {
    state.page = p;
    render();
  });

  const pageSelect = q('contactPageSelect');
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

  renderContactTable(state.filtered.slice(start, end));

  const selected = getSelectedContact();
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
    renderChildLists(selected);
  }
}

function renderContactTable(rows) {
  const tbody = q('contactTableBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(c => {
    const sel = String(c.id) === String(state.selectedId);
    return `<tr data-id="${escapeHtml(c.id)}" class="${sel ? 'selected' : ''}">
      <td data-col-key="companyId">${escapeHtml(c.companyId)}</td>
      <td data-col-key="company">${escapeHtml(c.company)}</td>
      <td data-col-key="dept">${escapeHtml(c.dept)}</td>
      <td data-col-key="last" class="blue-link">${escapeHtml(c.last)}</td>
      <td data-col-key="first">${escapeHtml(c.first)}</td>
      <td data-col-key="kana">${escapeHtml(c.kana)}</td>
      <td data-col-key="tel" class="tel-num">${escapeHtml(c.tel)}</td>
      <td data-col-key="mobile" class="tel-num">${escapeHtml(c.mobile)}</td>
      <td data-col-key="email">${escapeHtml(c.email)}</td>
      <td data-col-key="role">${escapeHtml(c.role)}</td>
      <td data-col-key="rank">${escapeHtml(c.rank)}</td>
      <td data-col-key="pos">${escapeHtml(c.pos)}</td>
      <td data-col-key="addr" title="${escapeHtml(c.addr)}">${escapeHtml(c.addr)}</td>
    </tr>`;
  }).join('');

  syncResizableTableBody('#contactTable');
}

function fillDetailForm(c) {
  const set = (sel, val) => { const el = q(sel); if (el) el.value = val ?? ''; };
  set('contactDetailId', c.id);
  set('contactDetailLast', c.last);
  set('contactDetailFirst', c.first);
  set('contactDetailKana', c.kana);
  set('mainContactCompanyName', c.company);
  set('contactDetailDept', c.dept);
  set('contactDetailTel', c.tel);
  set('contactDetailExt', c.ext);
  set('contactDetailFax', c.fax);
  set('contactDetailMobile', c.mobile);
  set('contactDetailEmail', c.email);
  set('contactDetailRemark', c.remark);
}

function renderChildLists(c) {
  state.contactActivitiesPage = 1;
  state.contactProjectsPage = 1;
  renderContactActivitiesList(c);
  renderContactProjectsList(c);
}

function renderContactActivitiesList(c) {
  const wrap = q('contactActivitiesList');
  const pager = q('contactActivitiesPager');
  if (!wrap) return;

  const items = mockActivities.filter(a => String(a.contactId) === String(c.id));
  const total = items.length;

  if (total === 0) {
    renderTabEmptyState(wrap, pager, TAB_EMPTY.contactActivities);
    return;
  }
  showTabPager(pager);

  const size = state.contactActivitiesPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (state.contactActivitiesPage > totalPages) state.contactActivitiesPage = totalPages;
  if (state.contactActivitiesPage < 1) state.contactActivitiesPage = 1;

  const start = (state.contactActivitiesPage - 1) * size;
  const sliced = items.slice(start, Math.min(start + size, total));

  const actCols = [
    { key: 'date', label: '活動日', width: 100 },
    { key: 'rep', label: '営業担当', width: 120 },
    { key: 'type', label: 'タイプ', width: 90 },
    { key: 'comment', label: 'コメント', width: 200 },
    { key: 'purpose', label: '目的', width: 120 },
  ];
  let html = `<table class="t" id="contactActivitiesTable">${buildColgroup(actCols)}${buildTheadRow(actCols)}<tbody>`;

  if (!sliced.length) {
    html += '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
  } else {
    html += sliced.map(a => `<tr data-id="${escapeHtml(a.id)}">
      <td data-col-key="date">${escapeHtml(a.date)}</td>
      <td data-col-key="rep">${escapeHtml(a.rep)}</td>
      <td data-col-key="type"><span class="${escapeHtml(a.typeClass || '')}">${escapeHtml(a.type)}</span></td>
      <td data-col-key="comment" title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
      <td data-col-key="purpose">${escapeHtml(a.purpose || '')}</td>
    </tr>`).join('');
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
  const actTable = wrap.querySelector('#contactActivitiesTable');
  setupResizableTable(actTable, {
    orderKey: 'smos.ct01.contactActivities.colOrder',
    widthKey: 'smos.ct01.contactActivities.colWidths',
  });
  syncResizableTableBody(actTable);

  updateTabPager('contactActivities', {
    total,
    page: state.contactActivitiesPage,
    pageSize: size,
  }, (p) => {
    state.contactActivitiesPage = p;
    renderContactActivitiesList(c);
  });
}

function renderContactProjectsList(c) {
  const wrap = q('contactProjectsList');
  const pager = q('contactProjectsPager');
  if (!wrap) return;

  const items = mockProjects.filter(p => String(p.contactId) === String(c.id));
  const total = items.length;

  if (total === 0) {
    renderTabEmptyState(wrap, pager, TAB_EMPTY.contactProjects);
    return;
  }
  showTabPager(pager);

  const size = state.contactProjectsPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (state.contactProjectsPage > totalPages) state.contactProjectsPage = totalPages;
  if (state.contactProjectsPage < 1) state.contactProjectsPage = 1;

  const start = (state.contactProjectsPage - 1) * size;
  const sliced = items.slice(start, Math.min(start + size, total));

  const prCols = [
    { key: 'issueDate', label: '話題日', width: 100 },
    { key: 'saleDate', label: '売上日', width: 100 },
    { key: 'status', label: '案件ステータス', width: 100 },
    { key: 'rep', label: '営業担当', width: 120 },
    { key: 'name', label: '案件名', width: 160 },
    { key: 'contact', label: '担当(姓)', width: 100 },
    { key: 'summary', label: '案件概要', width: 200 },
    { key: 'initial', label: '当初確度', width: 90 },
    { key: 'motivation', label: '発生動機', width: 100 },
    { key: 'method', label: '引合手段', width: 100 },
  ];
  let html = `<table class="t" id="contactProjectsTable">${buildColgroup(prCols)}${buildTheadRow(prCols)}<tbody>`;

  if (!sliced.length) {
    html += '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
  } else {
    html += sliced.map(p => `<tr>
      <td data-col-key="issueDate">${escapeHtml(p.issueDate || '-')}</td>
      <td data-col-key="saleDate">${escapeHtml(p.saleDate || '-')}</td>
      <td data-col-key="status">${escapeHtml(p.status || '-')}</td>
      <td data-col-key="rep">${escapeHtml(p.rep || '-')}</td>
      <td data-col-key="name">${escapeHtml(p.name || '-')}</td>
      <td data-col-key="contact">${escapeHtml(p.contact || '-')}</td>
      <td data-col-key="summary" title="${escapeHtml(p.summary || '')}">${escapeHtml(p.summary || '')}</td>
      <td data-col-key="initial">${escapeHtml(p.initial || '-')}</td>
      <td data-col-key="motivation">${escapeHtml(p.motivation || '-')}</td>
      <td data-col-key="method">${escapeHtml(p.method || '-')}</td>
    </tr>`).join('');
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
  const prTable = wrap.querySelector('#contactProjectsTable');
  setupResizableTable(prTable, {
    orderKey: 'smos.ct01.contactProjects.colOrder',
    widthKey: 'smos.ct01.contactProjects.colWidths',
  });
  syncResizableTableBody(prTable);

  updateTabPager('contactProjects', {
    total,
    page: state.contactProjectsPage,
    pageSize: size,
  }, (p) => {
    state.contactProjectsPage = p;
    renderContactProjectsList(c);
  });
}

function initResizer() {
  const resizer = q('contact-resizer');
  const container = document.querySelector('#contact-root .company-main');
  if (!resizer || !container) return;

  if (!container.style.getPropertyValue('--grid-height')) {
    container.style.setProperty('--grid-height', '400px');
  }
  try {
    const saved = parseInt(localStorage.getItem('smos.ct01.listH') || '', 10);
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
      localStorage.setItem('smos.ct01.listH', String(h));
    } catch { /* ignore */ }
  });
}

function startCellEditing(td, tr) {
  const actId = tr.getAttribute('data-id');
  const colKey = td.getAttribute('data-col-key');
  const c = getSelectedContact();
  if (!c) return;

  const act = mockActivities.find(a => String(a.id) === String(actId));
  if (!act) return;

  td.innerHTML = '';
  
  let editor;
  if (colKey === 'date') {
    editor = document.createElement('input');
    editor.type = 'date';
    editor.className = 'input table-edit-input';
    editor.value = act.date ? act.date.replace(/\//g, '-') : '';
    td.appendChild(editor);
  } else if (colKey === 'rep') {
    editor = document.createElement('select');
    editor.className = 'select table-edit-select';
    saleOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.label;
      o.textContent = opt.label;
      if (opt.label === act.rep) o.selected = true;
      editor.appendChild(o);
    });
    td.appendChild(editor);
  } else if (colKey === 'type') {
    editor = document.createElement('select');
    editor.className = 'select table-edit-select';
    typeSaleOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.label;
      o.textContent = opt.label;
      if (opt.label === act.type) o.selected = true;
      editor.appendChild(o);
    });
    td.appendChild(editor);
  } else if (colKey === 'comment' || colKey === 'purpose') {
    editor = document.createElement('input');
    editor.type = 'text';
    editor.className = 'input table-edit-input';
    editor.value = act[colKey] || '';
    td.appendChild(editor);
  } else {
    renderContactActivitiesList(c);
    return;
  }

  editor.focus();

  let finished = false;
  const saveChange = () => {
    if (finished) return;
    finished = true;

    let newVal = editor.value;
    if (colKey === 'date') {
      if (newVal) {
        newVal = newVal.replace(/-/g, '/');
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        newVal = `${yyyy}/${mm}/${dd}`;
      }
      act.date = newVal;
    } else if (colKey === 'rep') {
      act.rep = newVal;
    } else if (colKey === 'type') {
      act.type = newVal;
      const classMap = {
        '訪問': 'type-visit',
        'TEL': 'type-tel',
        'メール': 'type-email',
        'Web面談': 'type-web',
        'その他': 'type-other'
      };
      act.typeClass = classMap[newVal] || 'type-other';
    } else if (colKey === 'comment') {
      act.comment = newVal;
    } else if (colKey === 'purpose') {
      act.purpose = newVal;
    }

    renderContactActivitiesList(c);
  };

  editor.addEventListener('blur', saveChange);
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveChange();
    } else if (e.key === 'Escape') {
      finished = true;
      renderContactActivitiesList(c);
    }
  });
}
