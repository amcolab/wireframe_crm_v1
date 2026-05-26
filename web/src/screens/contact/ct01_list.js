import { q, escapeHtml } from '../../utils/helpers.js';
import { mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';
import { renderPageNumberButtons } from '../../utils/pager.js';
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

  q('btnContactNewActivity')?.addEventListener('click', () => { q('dlgActivityDetail')?.showModal(); });
  q('btnContactCreateMain')?.addEventListener('click', () => { q('dlgContactDetailNew')?.showModal(); });
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
      <td>${escapeHtml(c.companyId)}</td>
      <td>${escapeHtml(c.company)}</td>
      <td>${escapeHtml(c.dept)}</td>
      <td class="blue-link">${escapeHtml(c.last)}</td>
      <td>${escapeHtml(c.first)}</td>
      <td>${escapeHtml(c.kana)}</td>
      <td class="tel-num">${escapeHtml(c.tel)}</td>
      <td class="tel-num">${escapeHtml(c.mobile)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.role)}</td>
      <td>${escapeHtml(c.rank)}</td>
      <td>${escapeHtml(c.pos)}</td>
      <td title="${escapeHtml(c.addr)}">${escapeHtml(c.addr)}</td>
    </tr>`;
  }).join('');
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

  let html = `<table class="t"><thead><tr>
    <th>活動日</th><th>営業担当</th><th>タイプ</th><th>コメント</th><th>目的</th>
  </tr></thead><tbody>`;

  if (!sliced.length) {
    html += '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
  } else {
    html += sliced.map(a => `<tr>
      <td>${escapeHtml(a.date)}</td>
      <td>${escapeHtml(a.rep)}</td>
      <td><span class="${escapeHtml(a.typeClass || '')}">${escapeHtml(a.type)}</span></td>
      <td title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
      <td>${escapeHtml(a.purpose || '')}</td>
    </tr>`).join('');
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;

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

  let html = `<table class="t"><thead><tr>
    <th>話題日</th><th>売上日</th><th>案件ステータス</th><th>営業担当</th><th>案件名</th>
    <th>担当(姓)</th><th>案件概要</th><th>当初確度</th><th>発生動機</th><th>引合手段</th>
  </tr></thead><tbody>`;

  if (!sliced.length) {
    html += '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
  } else {
    html += sliced.map(p => `<tr>
      <td>${escapeHtml(p.issueDate || '-')}</td>
      <td>${escapeHtml(p.saleDate || '-')}</td>
      <td>${escapeHtml(p.status || '-')}</td>
      <td>${escapeHtml(p.rep || '-')}</td>
      <td>${escapeHtml(p.name || '-')}</td>
      <td>${escapeHtml(p.contact || '-')}</td>
      <td title="${escapeHtml(p.summary || '')}">${escapeHtml(p.summary || '')}</td>
      <td>${escapeHtml(p.initial || '-')}</td>
      <td>${escapeHtml(p.motivation || '-')}</td>
      <td>${escapeHtml(p.method || '-')}</td>
    </tr>`).join('');
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;

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
