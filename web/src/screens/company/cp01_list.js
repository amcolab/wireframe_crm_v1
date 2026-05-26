import { q, escapeHtml, toNum, includesPartial } from '../../utils/helpers.js';
import { mockCompanies, mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';
import { showToast } from '../../utils/toast.js';
import { initTableColResize } from '../../utils/tableColResize.js';
import { initTableColReorder, syncTableBodyColumnOrder } from '../../utils/tableColReorder.js';
import {
  readFormSearchConditions,
  hasSearchConditions,
  syncSearchFiltersIndicator,
  resetFormMultiSelects,
  clearAdvancedSearch,
} from '../../utils/searchFilters.js';

let state = {
  companies: [...mockCompanies],
  filtered: [...mockCompanies],
  selectedId: mockCompanies[0]?.id ?? null,
  sortKey: 'id',
  sortDir: 'desc',
  page: 1,
  pageSize: 25,
  advanced: null,

  contactsPage: 1,
  contactsPageSize: 10,
  activitiesPage: 1,
  activitiesPageSize: 10,
  projectsPage: 1,
  projectsPageSize: 10
};

let isReady = false;
let companyTableBound = false;

export function init() {
  console.log('Company screen initialized');
  bindUi();
  bindCompanyTable();
  bindCompanyTableSort();
  initTableColReorder('#companyTable', {
    storeKey: 'smos.cp01.colOrder',
    widthStoreKey: 'smos.cp01.colWidths',
  });
  initTableColResize('#companyTable', 'smos.cp01.colWidths');
  initResizer();

  // Force an initial render after a small delay to ensure everything is ready
  setTimeout(() => {
    render();
  }, 200);
}

function bindUi() {
  // Prevent duplicate bindings if possible, though in this SPA the DOM is fresh
  const root = q('company-root');
  if (root?.dataset.bound) return;
  root.dataset.bound = "true";

  const inputName = q('companySearchName');
  const btnSearch = q('btnCompanySearch');
  const btnClear = q('btnCompanyClear');
  const btnAdv = q('btnCompanyAdvancedSearch');
  const btnCreate = q('btnCompanyCreate');

  const dlgAdv = q('dlgCompanyAdvancedSearch');
  const formAdv = q('formCompanyAdvancedSearch');
  const btnAdvClear = q('btnAdvancedClear');
  const btnAdvApply = q('btnAdvancedApply');

  const dlgCreate = q('dlgCompanyCreate');
  const formCreate = q('formCompanyCreate');

  const tabs = document.querySelectorAll('[data-company-tab]');

  function applyBasicSearch() {
    const name = (inputName?.value ?? '').trim();
    state.advanced = state.advanced || null;
    state.filtered = filterCompanies(state.companies, { ...state.advanced, name });
    state.page = 1;
    if (!state.filtered.some(c => String(c.id) === String(state.selectedId))) {
      state.selectedId = state.filtered[0] ? String(state.filtered[0].id) : null;
    }
    render();
  }

  btnSearch?.addEventListener('click', applyBasicSearch);
  inputName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyBasicSearch();
  });

  btnClear?.addEventListener('click', () => {
    if (inputName) inputName.value = '';
    state.filtered = [...state.companies];
    state.page = 1;
    state.selectedId = state.filtered[0] ? String(state.filtered[0].id) : null;
    clearAdvancedSearch({ btn: btnAdv, form: formAdv, state });
    render();
  });

  inputName?.addEventListener('input', () => {
    if (!hasAnySearchConditions(inputName, state.advanced)) {
      syncSearchFiltersIndicator(btnAdv, null);
    }
  });

  btnAdv?.addEventListener('click', () => {
    if (dlgAdv?.showModal) dlgAdv.showModal();
  });

  btnAdvClear?.addEventListener('click', () => {
    formAdv?.reset();
    resetFormMultiSelects(formAdv);
  });

  btnAdvApply?.addEventListener('click', () => {
    const adv = readFormSearchConditions(formAdv);
    state.advanced = hasSearchConditions(adv) ? adv : null;
    const name = (inputName?.value ?? '').trim();
    state.filtered = filterCompanies(state.companies, { ...(state.advanced || {}), name });
    state.page = 1;
    state.selectedId = state.filtered[0] ? String(state.filtered[0].id) : null;
    syncSearchFiltersIndicator(btnAdv, state.advanced);
    dlgAdv?.close();
    render();
  });

  btnCreate?.addEventListener('click', () => {
    const selected = state.companies.find(c => String(c.id) === String(state.selectedId)) || null;
    if (formCreate) formCreate.reset();
    fillCreateDialog(formCreate, selected);
    if (dlgCreate?.showModal) dlgCreate.showModal();
  });

  q('btnCreateCompanyOk')?.addEventListener('click', () => {
    const fd = new FormData(formCreate);
    const next = {
      name: String(fd.get('name') || ''),
      tel: String(fd.get('tel') || ''),
      fax: String(fd.get('fax') || ''),
      area: String(fd.get('area') || ''),
      postal: String(fd.get('postal') || ''),
      pref: String(fd.get('pref') || ''),
      addr: String(fd.get('addr') || ''),
      industry: String(fd.get('industry') || ''),
      biz: String(fd.get('biz') || ''),
      scale: String(fd.get('scale') || ''),
      type: String(fd.get('type') || ''),
      corpNo: String(fd.get('corpNo') || ''),
      employees: String(fd.get('employees') || ''),
      closingMonth: String(fd.get('closingMonth') || ''),
      revenue: String(fd.get('revenue') || ''),
      capital: String(fd.get('capital') || ''),
      remark: String(fd.get('remark') || ''),
      noDoc: !!formCreate.querySelector('[name="noDoc"]')?.checked,
      noTel: !!formCreate.querySelector('[name="noTel"]')?.checked
    };

    const maxId = state.companies.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 1000);
    const newId = String(maxId + 1);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16).replace(/-/g, '/');
    const newComp = {
      ...next,
      id: newId,
      createdAt: now,
      createdBy: 'admin',
      updatedAt: now,
      updatedBy: 'admin'
    };

    state.companies.push(newComp);
    state.filtered.push(newComp);
    state.selectedId = newId;

    dlgCreate?.close();
    render();
  });


  function syncDetailTabLayout(tab) {
    const card = document.querySelector('.company-detail');
    if (!card) return;
    const isDetail = tab === 'detail';
    card.classList.toggle('detail-tab-mode', isDetail);
    card.classList.toggle('table-tab-mode', !isDetail);
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-company-tab');
      tabs.forEach(x => x.classList.toggle('active', x === t));
      const panels = document.querySelectorAll('[data-company-panel]');
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-company-panel') === tab));
      syncDetailTabLayout(tab);

      // Toggle "New" buttons
      const btnNewContact = q('btnNewContact');
      const btnNewActivity = q('btnNewActivity');
      const btnNewProject = q('btnNewProject');

      if (btnNewContact) btnNewContact.style.display = tab === 'contacts' ? 'block' : 'none';
      if (btnNewActivity) btnNewActivity.style.display = tab === 'activities' ? 'block' : 'none';
      if (btnNewProject) btnNewProject.style.display = tab === 'projects' ? 'block' : 'none';
    });
  });

  q('btnNewContact')?.addEventListener('click', () => {
    q('dlgContactDetailNew')?.showModal();
  });

  q('btnNewActivity')?.addEventListener('click', () => {
    q('dlgActivityDetail')?.showModal();
  });

  q('btnNewProject')?.addEventListener('click', () => {
    q('dlgProjectDetail')?.showModal();
  });

  // Modal triggers inside detail modals
  const bindModalTrigger = (btnId, dlgId) => {
    const btn = q(btnId);
    const dlg = q(dlgId);
    if (btn && dlg) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Opening modal: ${dlgId} from ${btnId}`);
        if (dlg.showModal) dlg.showModal();
      });
    } else {
      console.warn(`Missing element for binding: btn=${btnId}, dlg=${dlgId}`);
    }
  };

  bindModalTrigger('btnActivityContactLookup', 'dlgContactLookup');
  bindModalTrigger('btnActivityContactNew', 'dlgContactDetailNew');
  bindModalTrigger('btnActivityProjectLookup', 'dlgProjectLookup');
  bindModalTrigger('btnActivityProjectNew', 'dlgProjectDetail');

  bindModalTrigger('btnContactCompanyLookup', 'dlgCompanyLookup');
  bindModalTrigger('btnContactCompanyNew', 'dlgCompanyCreate');
  bindModalTrigger('btnMainContactLookupCompany', 'dlgCompanyLookup');
  bindModalTrigger('btnMainContactCreateCompany', 'dlgCompanyCreate');

  bindModalTrigger('btnProjectContactLookup', 'dlgContactLookup');
  bindModalTrigger('btnProjectContactNew', 'dlgContactDetailNew');

  // Save/Delete inside new modals
  const closeDialogOnAction = (btnId, dlgId, confirmMsg) => {
    const btn = q(btnId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirmMsg || confirm(confirmMsg)) {
          console.log(`Closing modal: ${dlgId} via ${btnId}`);
          q(dlgId)?.close();
        }
      });
    }
  };

  closeDialogOnAction('btnContactSave', 'dlgContactDetailNew');

  closeDialogOnAction('btnActivitySave', 'dlgActivityDetail');

  closeDialogOnAction('btnProjectSave', 'dlgProjectDetail');

  const dlgConfirmDelete = q('dlgCompanyConfirmDelete');
  const btnConfirmDelete = q('dlgCompanyConfirmDeleteBtn');

  dlgConfirmDelete?.querySelectorAll('[data-confirm-close]').forEach(btn => {
    btn.addEventListener('click', () => dlgConfirmDelete.close());
  });
  dlgConfirmDelete?.addEventListener('click', (e) => {
    if (e.target === dlgConfirmDelete) dlgConfirmDelete.close();
  });

  q('btnCompanySave')?.addEventListener('click', () => {
    const selected = state.companies.find(c => String(c.id) === String(state.selectedId));
    if (!selected) return;
    const next = readDetailForm();
    if (!next.name.trim()) {
      showToast('会社名は必須です', 'danger');
      return;
    }
    Object.assign(selected, next, {
      updatedAt: new Date().toISOString().slice(0, 10).replaceAll('-', '/') + ' 12:00',
      updatedBy: 'admin'
    });
    const name = (inputName?.value ?? '').trim();
    state.filtered = filterCompanies(state.companies, { ...(state.advanced || null), name });
    render();
    showToast(`会社「${selected.name}」を保存しました`, 'success');
  });

  q('btnCompanyDelete')?.addEventListener('click', () => {
    const selected = state.companies.find(c => String(c.id) === String(state.selectedId));
    if (!selected || !dlgConfirmDelete) return;
    const idEl = q('dlgCompanyConfirmId');
    const nameEl = q('dlgCompanyConfirmName');
    if (idEl) idEl.textContent = String(selected.id);
    if (nameEl) nameEl.textContent = selected.name || '—';
    dlgConfirmDelete.showModal();
  });

  btnConfirmDelete?.addEventListener('click', () => {
    const selected = state.companies.find(c => String(c.id) === String(state.selectedId));
    if (!selected) return;
    const removedName = selected.name;
    dlgConfirmDelete?.close();
    state.companies = state.companies.filter(c => String(c.id) !== String(selected.id));
    state.filtered = state.filtered.filter(c => String(c.id) !== String(selected.id));
    state.selectedId = state.filtered[0] ? String(state.filtered[0].id) : null;
    render();
    showToast(`会社「${removedName}」を削除しました`, 'success');
  });

  q('btnCompanyFirstPage')?.addEventListener('click', () => {
    state.page = 1;
    render();
  });
  q('btnCompanyPrevPage')?.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      render();
    }
  });
  q('btnCompanyNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    if (state.page < totalPages) {
      state.page++;
      render();
    }
  });
  q('btnCompanyLastPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);
    state.page = totalPages;
    render();
  });

  q('companyPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value) || 1;
    render();
  });

  q('companyPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value) || 100;
    state.page = 1;
    render();
  });

  // Dynamic child tables pagination helper
  const bindChildPager = (prefix, renderFn) => {
    const getSelectedCompany = () => state.companies.find(c => String(c.id) === String(state.selectedId));
    
    q(`btn${prefix}FirstPage`)?.addEventListener('click', () => {
      state[`${prefix.toLowerCase()}Page`] = 1;
      const c = getSelectedCompany();
      if (c) renderFn(c);
    });
    q(`btn${prefix}PrevPage`)?.addEventListener('click', () => {
      if (state[`${prefix.toLowerCase()}Page`] > 1) {
        state[`${prefix.toLowerCase()}Page`]--;
        const c = getSelectedCompany();
        if (c) renderFn(c);
      }
    });
    q(`btn${prefix}NextPage`)?.addEventListener('click', () => {
      const c = getSelectedCompany();
      if (!c) return;
      let items = [];
      if (prefix === 'Contacts') items = mockContacts.filter(m => String(m.companyId) === String(c.id));
      else if (prefix === 'Activities') {
        const contactIds = mockContacts.filter(m => String(m.companyId) === String(c.id)).map(m => String(m.id));
        items = mockActivities.filter(a => contactIds.includes(String(a.contactId)) || String(a.company) === String(c.name));
      } else if (prefix === 'Projects') {
        const contactIds = mockContacts.filter(m => String(m.companyId) === String(c.id)).map(m => String(m.id));
        items = mockProjects.filter(p => contactIds.includes(String(p.contactId)) || String(p.company) === String(c.name));
      }
      const totalPages = Math.ceil(items.length / state[`${prefix.toLowerCase()}PageSize`]);
      if (state[`${prefix.toLowerCase()}Page`] < totalPages) {
        state[`${prefix.toLowerCase()}Page`]++;
        renderFn(c);
      }
    });
    q(`btn${prefix}LastPage`)?.addEventListener('click', () => {
      const c = getSelectedCompany();
      if (!c) return;
      let items = [];
      if (prefix === 'Contacts') items = mockContacts.filter(m => String(m.companyId) === String(c.id));
      else if (prefix === 'Activities') {
        const contactIds = mockContacts.filter(m => String(m.companyId) === String(c.id)).map(m => String(m.id));
        items = mockActivities.filter(a => contactIds.includes(String(a.contactId)) || String(a.company) === String(c.name));
      } else if (prefix === 'Projects') {
        const contactIds = mockContacts.filter(m => String(m.companyId) === String(c.id)).map(m => String(m.id));
        items = mockProjects.filter(p => contactIds.includes(String(p.contactId)) || String(p.company) === String(c.name));
      }
      const totalPages = Math.max(1, Math.ceil(items.length / state[`${prefix.toLowerCase()}PageSize`]));
      state[`${prefix.toLowerCase()}Page`] = totalPages;
      renderFn(c);
    });
    q(`${prefix.toLowerCase()}PageSelect`)?.addEventListener('change', (e) => {
      state[`${prefix.toLowerCase()}Page`] = parseInt(e.target.value) || 1;
      const c = getSelectedCompany();
      if (c) renderFn(c);
    });
    q(`${prefix.toLowerCase()}PageSize`)?.addEventListener('change', (e) => {
      state[`${prefix.toLowerCase()}PageSize`] = parseInt(e.target.value) || 10;
      state[`${prefix.toLowerCase()}Page`] = 1;
      const c = getSelectedCompany();
      if (c) renderFn(c);
    });
  };

  bindChildPager('Contacts', renderContactsList);
  bindChildPager('Activities', renderActivitiesList);
  bindChildPager('Projects', renderProjectsList);

  syncDetailTabLayout('detail');
}

function render() {
  syncSearchFiltersIndicator(q('btnCompanyAdvancedSearch'), state.advanced);

  const tbody = q('companyTableBody');
  const meta = q('companyResultMeta');
  const totalCount = q('companyTotalCount');
  const pageNumbers = q('companyPageNumbers');
  const pageSelect = q('companyPageSelect');
  const pageTotal = q('companyPageTotal');
  const rangeStart = q('companyRangeStart');
  const rangeEnd = q('companyRangeEnd');

  const sorted = getSortedFiltered();
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  if (meta) meta.textContent = `全 ${total} 件`;
  if (totalCount) totalCount.textContent = total;
  if (pageTotal) pageTotal.textContent = `/ ${totalPages}`;

  const start = (state.page - 1) * state.pageSize;
  const actualEndIdx = Math.min(start + state.pageSize, total);

  if (rangeStart) rangeStart.textContent = total > 0 ? (start + 1) : 0;
  if (rangeEnd) rangeEnd.textContent = actualEndIdx;

  if (pageNumbers) {
    renderPageNumberButtons(pageNumbers, state.page, totalPages, (p) => {
      state.page = p;
      render();
    });
  }

  // Sync Page Select
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

  const rows = sorted.slice(start, actualEndIdx);
  renderCompanyTable(rows);
  updateSortHeaderUI();

  // CRITICAL: Always use String for ID comparison to avoid mismatches
  const selected = state.companies.find(c => String(c.id) === String(state.selectedId)) || state.filtered[0] || null;
  if (selected) {
    state.selectedId = String(selected.id);
    fillDetailForm(selected);
    renderChildLists(selected);
  }
}

function filterCompanies(companies, cond) {
  const c = cond || {};
  const name = (c.name || '').trim();
  const keyword = (c.keyword || '').trim();

  return companies.filter(x => {
    if (name && !includesPartial(x.name, name)) return false;
    if (keyword) {
      const all = [x.id, x.name, x.tel, x.fax, x.postal, x.pref, x.area, x.addr, x.industry, x.biz, x.scale, x.type, x.corpNo].join(' ');
      if (!includesPartial(all, keyword)) return false;
    }
    return true;
  });
}

function hasAnySearchConditions(inputName, advanced) {
  const name = (inputName?.value ?? '').trim();
  return !!name || hasSearchConditions(advanced);
}

function fillCreateDialog(form, selected) {
  if (!form) return;
  const set = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.value = val ?? '';
  };
  set('name', selected?.name ?? '');
  set('tel', selected?.tel ?? '');
  // ... more fields ...
}

function fillDetailForm(c) {
  const setVal = (id, val) => {
    const el = q(id);
    if (el) el.value = val ?? '';
  };
  const setCheck = (id, val) => {
    const el = q(id);
    if (el) el.checked = !!val;
  };
  setVal('companyDetailId', c?.id ?? '');
  setVal('companyDetailName', c?.name ?? '');
  setVal('companyDetailTel', c?.tel ?? '');
  setVal('companyDetailFax', c?.fax ?? '');
  setVal('companyDetailArea', c?.area ?? '');
  setVal('companyDetailPostal', c?.postal ?? '');
  setVal('companyDetailPref', c?.pref ?? '');
  setVal('companyDetailAddr', c?.addr ?? '');
  setVal('companyDetailIndustry', c?.industry ?? '');
  setVal('companyDetailBiz', c?.biz ?? '');
  setVal('companyDetailScale', c?.scale ?? '');
  setVal('companyDetailType', c?.type ?? '');
  setVal('companyDetailCorpNo', c?.corpNo ?? '');
  setVal('companyDetailEmployees', c?.employees ?? '');
  setVal('companyDetailClosingMonth', c?.closingMonth ?? '');
  setVal('companyDetailRevenue', c?.revenue ?? '');
  setVal('companyDetailCapital', c?.capital ?? '');
  setCheck('companyDetailNoDoc', c?.noDoc ?? false);
  setCheck('companyDetailNoTel', c?.noTel ?? false);
  setVal('companyDetailRemark', c?.remark ?? '');
  setVal('companyDetailCreatedAt', c?.createdAt ?? '');
  setVal('companyDetailCreatedBy', c?.createdBy ?? '');
  setVal('companyDetailUpdatedAt', c?.updatedAt ?? '');
  setVal('companyDetailUpdatedBy', c?.updatedBy ?? '');
}

function readDetailForm() {
  return {
    name: q('companyDetailName')?.value ?? '',
    tel: q('companyDetailTel')?.value ?? '',
    fax: q('companyDetailFax')?.value ?? '',
    area: q('companyDetailArea')?.value ?? '',
    postal: q('companyDetailPostal')?.value ?? '',
    pref: q('companyDetailPref')?.value ?? '',
    addr: q('companyDetailAddr')?.value ?? '',
    industry: q('companyDetailIndustry')?.value ?? '',
    biz: q('companyDetailBiz')?.value ?? '',
    scale: q('companyDetailScale')?.value ?? '',
    type: q('companyDetailType')?.value ?? '',
    corpNo: q('companyDetailCorpNo')?.value ?? '',
    employees: q('companyDetailEmployees')?.value ?? '',
    closingMonth: q('companyDetailClosingMonth')?.value ?? '',
    revenue: q('companyDetailRevenue')?.value ?? '',
    capital: q('companyDetailCapital')?.value ?? '',
    noDoc: !!q('companyDetailNoDoc')?.checked,
    noTel: !!q('companyDetailNoTel')?.checked,
    remark: q('companyDetailRemark')?.value ?? '',
  };
}

const TAB_EMPTY = {
  contacts: {
    title: '担当者データはまだありません',
    desc: 'この会社の担当者を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
  activities: {
    title: '活動データはまだありません',
    desc: 'この会社の活動履歴を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
  },
  projects: {
    title: '案件データはまだありません',
    desc: 'この会社の案件を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3"/></svg>',
  },
};

function renderTabEmptyState(container, pagerEl, config) {
  if (pagerEl) pagerEl.style.display = 'none';
  container.innerHTML = `
    <div class="empty-state">
      ${config.icon}
      <div class="title">${escapeHtml(config.title)}</div>
      <div class="desc">${escapeHtml(config.desc)}</div>
    </div>`;
}

function showTabPager(pagerEl) {
  if (pagerEl) pagerEl.style.display = '';
}

function renderPageNumberButtons(container, currentPage, totalPages, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages < 1) return;

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    const first = document.createElement('button');
    first.type = 'button';
    first.className = `pg-btn ${currentPage === 1 ? 'active' : ''}`;
    first.textContent = '1';
    first.onclick = () => onSelect(1);
    container.appendChild(first);
    if (startPage > 2) {
      const sep = document.createElement('span');
      sep.className = 'page-sep';
      sep.textContent = '…';
      container.appendChild(sep);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    if (startPage > 1 && p === 1) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pg-btn ${p === currentPage ? 'active' : ''}`;
    btn.textContent = String(p);
    btn.onclick = () => onSelect(p);
    container.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const sep = document.createElement('span');
      sep.className = 'page-sep';
      sep.textContent = '…';
      container.appendChild(sep);
    }
    const last = document.createElement('button');
    last.type = 'button';
    last.className = `pg-btn ${currentPage === totalPages ? 'active' : ''}`;
    last.textContent = String(totalPages);
    last.onclick = () => onSelect(totalPages);
    container.appendChild(last);
  }
}

function updateTabPager(tabName, { total, page, pageSize }, onPageChange) {
  const key = tabName.toLowerCase();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  const totalCountEl = q(`${key}TotalCount`);
  const rangeStartEl = q(`${key}RangeStart`);
  const rangeEndEl = q(`${key}RangeEnd`);
  const pageTotalEl = q(`${key}PageTotal`);
  const pageSelectEl = q(`${key}PageSelect`);
  const pageNumbersEl = q(`${key}PageNumbers`);

  if (totalCountEl) totalCountEl.textContent = total;
  if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (start + 1) : 0;
  if (rangeEndEl) rangeEndEl.textContent = end;
  if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

  if (pageSelectEl) {
    pageSelectEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = String(p);
      if (p === page) opt.selected = true;
      pageSelectEl.appendChild(opt);
    }
  }

  renderPageNumberButtons(pageNumbersEl, page, totalPages, (p) => {
    onPageChange(p);
  });

  const first = q(`btn${tabName}FirstPage`);
  const prev = q(`btn${tabName}PrevPage`);
  const next = q(`btn${tabName}NextPage`);
  const last = q(`btn${tabName}LastPage`);
  if (first) first.disabled = page === 1;
  if (prev) prev.disabled = page === 1;
  if (next) next.disabled = page === totalPages;
  if (last) last.disabled = page === totalPages;
}

function renderContactsList(c) {
  const tableWrap = q('companyContactsList');
  if (!tableWrap) return;

  const pager = q('contactsPager');
  const contacts = mockContacts.filter(m => String(m.companyId) === String(c.id));
  const total = contacts.length;

  if (total === 0) {
    renderTabEmptyState(tableWrap, pager, TAB_EMPTY.contacts);
    return;
  }
  showTabPager(pager);
  const size = state.contactsPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  
  if (state.contactsPage > totalPages) state.contactsPage = totalPages;
  if (state.contactsPage < 1) state.contactsPage = 1;

  const start = (state.contactsPage - 1) * size;
  const actualEndIdx = Math.min(start + size, total);
  const sliced = contacts.slice(start, actualEndIdx);

  let contactsHtml = `
    <table class="t">
      <thead>
        <tr>
          <th>担当(姓)</th>
          <th>担当(名)</th>
          <th>フリガナ</th>
          <th>部署名</th>
          <th>TEL</th>
          <th>携帯電話</th>
          <th>Email</th>
          <th>役職名</th>
          <th>職位</th>
          <th>担当者備考</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (sliced.length === 0) {
    contactsHtml += `
      <tr>
        <td colspan="10" style="text-align:center; padding: 20px; color: var(--text-3);">表示するデータがありません</td>
      </tr>
    `;
  } else {
    contactsHtml += sliced.map(m => `
      <tr>
        <td class="blue-link">${escapeHtml(m.last)}</td>
        <td>${escapeHtml(m.first)}</td>
        <td>${escapeHtml(m.kana)}</td>
        <td>${escapeHtml(m.dept)}</td>
        <td>${escapeHtml(m.tel)}</td>
        <td>${escapeHtml(m.mobile)}</td>
        <td>${escapeHtml(m.email)}</td>
        <td>${escapeHtml(m.pos)}</td>
        <td>${escapeHtml(m.rank)}</td>
        <td title="${escapeHtml(m.remark)}">${escapeHtml(m.remark)}</td>
      </tr>
    `).join('');
  }

  contactsHtml += `</tbody></table>`;
  tableWrap.innerHTML = contactsHtml;

  updateTabPager('Contacts', {
    total,
    page: state.contactsPage,
    pageSize: size,
  }, (p) => {
    state.contactsPage = p;
    renderContactsList(c);
  });
}

function renderActivitiesList(c) {
  const tableWrap = q('companyActivitiesList');
  if (!tableWrap) return;

  const pager = q('activitiesPager');
  const companyContacts = mockContacts.filter(m => String(m.companyId) === String(c.id));
  const contactIds = companyContacts.map(m => String(m.id));
  const activities = mockActivities.filter(a => contactIds.includes(String(a.contactId)) || String(a.company) === String(c.name));
  const total = activities.length;

  if (total === 0) {
    renderTabEmptyState(tableWrap, pager, TAB_EMPTY.activities);
    return;
  }
  showTabPager(pager);
  const size = state.activitiesPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  
  if (state.activitiesPage > totalPages) state.activitiesPage = totalPages;
  if (state.activitiesPage < 1) state.activitiesPage = 1;

  const start = (state.activitiesPage - 1) * size;
  const actualEndIdx = Math.min(start + size, total);
  const sliced = activities.slice(start, actualEndIdx);

  let activitiesHtml = `
    <table class="t">
      <thead>
        <tr>
          <th>活動日</th>
          <th>営業担当</th>
          <th>担当(姓)</th>
          <th>タイプ</th>
          <th style="min-width: 250px;">コメント</th>
          <th>目的</th>
          <th>案件名</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (sliced.length === 0) {
    activitiesHtml += `
      <tr>
        <td colspan="7" style="text-align:center; padding: 20px; color: var(--text-3);">表示するデータがありません</td>
      </tr>
    `;
  } else {
    activitiesHtml += sliced.map(a => `
      <tr>
        <td>${escapeHtml(a.date)}</td>
        <td>${escapeHtml(a.rep)}</td>
        <td class="blue-link">${escapeHtml(a.contact)}</td>
        <td><span class="${a.typeClass}">${escapeHtml(a.type)}</span></td>
        <td title="${escapeHtml(a.comment)}">${escapeHtml(a.comment)}</td>
        <td>${escapeHtml(a.purpose || '')}</td>
        <td>${escapeHtml(a.projectName || '')}</td>
      </tr>
    `).join('');
  }

  activitiesHtml += `</tbody></table>`;
  tableWrap.innerHTML = activitiesHtml;

  updateTabPager('Activities', {
    total,
    page: state.activitiesPage,
    pageSize: size,
  }, (p) => {
    state.activitiesPage = p;
    renderActivitiesList(c);
  });
}

function renderProjectsList(c) {
  const tableWrap = q('companyProjectsList');
  if (!tableWrap) return;

  const pager = q('projectsPager');
  const companyContacts = mockContacts.filter(m => String(m.companyId) === String(c.id));
  const contactIds = companyContacts.map(m => String(m.id));
  const projects = mockProjects.filter(p => contactIds.includes(String(p.contactId)) || String(p.company) === String(c.name));
  const total = projects.length;

  if (total === 0) {
    renderTabEmptyState(tableWrap, pager, TAB_EMPTY.projects);
    return;
  }
  showTabPager(pager);
  const size = state.projectsPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  
  if (state.projectsPage > totalPages) state.projectsPage = totalPages;
  if (state.projectsPage < 1) state.projectsPage = 1;

  const start = (state.projectsPage - 1) * size;
  const actualEndIdx = Math.min(start + size, total);
  const sliced = projects.slice(start, actualEndIdx);

  let projectsHtml = `
    <table class="t">
      <thead>
        <tr>
          <th>話題日</th>
          <th>売上日</th>
          <th>フォロー予定</th>
          <th>案件ステータス</th>
          <th>営業担当</th>
          <th>案件名</th>
          <th>担当(姓)</th>
          <th style="min-width: 250px;">案件概要</th>
          <th>当初確度</th>
          <th>発生動機</th>
          <th>引合手段</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (sliced.length === 0) {
    projectsHtml += `
      <tr>
        <td colspan="11" style="text-align:center; padding: 20px; color: var(--text-3);">表示するデータがありません</td>
      </tr>
    `;
  } else {
    projectsHtml += sliced.map(p => `
      <tr>
        <td>${escapeHtml(p.issueDate)}</td>
        <td>${escapeHtml(p.saleDate || '')}</td>
        <td>${escapeHtml(p.followDate || '')}</td>
        <td>${escapeHtml(p.status)}</td>
        <td>${escapeHtml(p.rep)}</td>
        <td class="blue-link">${escapeHtml(p.name)}</td>
        <td class="blue-link">${escapeHtml(p.contact)}</td>
        <td title="${escapeHtml(p.summary)}">${escapeHtml(p.summary)}</td>
        <td>${escapeHtml(p.initial || '')}</td>
        <td>${escapeHtml(p.motivation || '')}</td>
        <td>${escapeHtml(p.method || '')}</td>
      </tr>
    `).join('');
  }

  projectsHtml += `</tbody></table>`;
  tableWrap.innerHTML = projectsHtml;

  updateTabPager('Projects', {
    total,
    page: state.projectsPage,
    pageSize: size,
  }, (p) => {
    state.projectsPage = p;
    renderProjectsList(c);
  });
}

function renderChildLists(c) {
  if (!c) return;
  renderContactsList(c);
  renderActivitiesList(c);
  renderProjectsList(c);
}

let companySortBound = false;

function compareCompanyRows(a, b, key, type) {
  let av = a[key];
  let bv = b[key];
  if (type === 'num') {
    av = parseFloat(String(av ?? '').replace(/,/g, '')) || 0;
    bv = parseFloat(String(bv ?? '').replace(/,/g, '')) || 0;
    return av < bv ? -1 : av > bv ? 1 : 0;
  }
  av = String(av ?? '');
  bv = String(bv ?? '');
  return av.localeCompare(bv, 'ja');
}

function getSortedFiltered() {
  const thead = document.querySelector('.list-stack table.t thead');
  const th = thead?.querySelector(`th[data-sort-key="${state.sortKey}"]`);
  const type = th?.getAttribute('data-sort-type') || 'str';
  return [...state.filtered].sort((a, b) => {
    const r = compareCompanyRows(a, b, state.sortKey, type);
    return state.sortDir === 'asc' ? r : -r;
  });
}

function updateSortHeaderUI() {
  const thead = document.querySelector('.list-stack table.t thead');
  if (!thead) return;
  thead.querySelectorAll('th[data-sort-key]').forEach(th => {
    const isActive = th.getAttribute('data-sort-key') === state.sortKey;
    th.classList.toggle('sort-asc', isActive && state.sortDir === 'asc');
    th.classList.toggle('sort-desc', isActive && state.sortDir === 'desc');
    th.setAttribute(
      'aria-sort',
      isActive ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
    );
  });
}

function bindCompanyTableSort() {
  const thead = document.querySelector('.list-stack table.t thead');
  if (!thead || companySortBound) return;
  companySortBound = true;
  thead.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort-key]');
    if (!th) return;
    const key = th.getAttribute('data-sort-key');
    if (key === state.sortKey) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      const type = th.getAttribute('data-sort-type');
      state.sortDir = type === 'num' ? 'desc' : 'asc';
    }
    state.page = 1;
    render();
  });
}

function bindCompanyTable() {
  const tbody = q('companyTableBody');
  if (!tbody || companyTableBound) return;
  companyTableBound = true;
  tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    const c = state.companies.find(x => String(x.id) === String(state.selectedId))
      || state.filtered.find(x => String(x.id) === String(state.selectedId));
    if (c) {
      fillDetailForm(c);
      renderChildLists(c);
    }
    render();
  });
}

function renderCompanyTable(rows) {
  const tbody = q('companyTableBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--text-3);">表示するデータがありません</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(c => {
    const selected = String(c.id) === String(state.selectedId);
    return `<tr data-id="${escapeHtml(c.id)}" class="${selected ? 'selected' : ''}">
      <td data-col-key="id">${escapeHtml(c.id)}</td>
      <td data-col-key="name">${escapeHtml(c.name)}</td>
      <td data-col-key="tel" class="tel-num">${escapeHtml(c.tel ?? '')}</td>
      <td data-col-key="addr">${escapeHtml(c.addr ?? '')}</td>
      <td data-col-key="industry">${escapeHtml(c.industry ?? '')}</td>
      <td data-col-key="biz">${escapeHtml(c.biz ?? '')}</td>
      <td data-col-key="scale">${escapeHtml(c.scale ?? '')}</td>
      <td data-col-key="type">${escapeHtml(c.type ?? '')}</td>
      <td data-col-key="employees" class="num">${escapeHtml(c.employees ?? '')}</td>
      <td data-col-key="area">${escapeHtml(c.area ?? '')}</td>
      <td data-col-key="pref">${escapeHtml(c.pref ?? '')}</td>
      <td data-col-key="remark" title="${escapeHtml(c.remark ?? '')}">${escapeHtml(c.remark ?? '')}</td>
    </tr>`;
  }).join('');

  syncTableBodyColumnOrder(q('companyTable'));
}

function initResizer() {
  const resizer = q('company-resizer');
  const container = document.querySelector('.company-main');

  if (!resizer || !container) return;

  if (!container.style.getPropertyValue('--grid-height')) {
    container.style.setProperty('--grid-height', '400px');
  }
  try {
    const saved = parseInt(localStorage.getItem('smos.cp01.listH') || '', 10);
    if (saved >= 160) container.style.setProperty('--grid-height', `${saved}px`);
  } catch {
    /* ignore */
  }

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
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

    let newHeight = relativeY - 6;
    if (newHeight < minGridHeight) newHeight = minGridHeight;
    if (newHeight > maxHeight) newHeight = maxHeight;

    container.style.setProperty('--grid-height', `${newHeight}px`);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      resizer.classList.remove('active');
      const h = parseInt(container.style.getPropertyValue('--grid-height') || '400', 10);
      try {
        localStorage.setItem('smos.cp01.listH', String(h));
      } catch {
        /* ignore */
      }
    }
  });
}
