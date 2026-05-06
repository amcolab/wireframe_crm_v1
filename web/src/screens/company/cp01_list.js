import { q, escapeHtml, toNum, includesPartial } from '../../utils/helpers.js';
import { mockCompanies, mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';

let state = {
  companies: [...mockCompanies],
  filtered: [...mockCompanies],
  selectedId: mockCompanies[0]?.id ?? null,
  page: 1,
  pageSize: 100,
  advanced: null
};

export function init() {
  console.log('Company screen initialized');
  bindUi();
  render();
}

function bindUi() {
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
    if (!state.filtered.some(c => c.id === state.selectedId)) {
      state.selectedId = state.filtered[0]?.id ?? null;
    }
    render();
  }

  btnSearch?.addEventListener('click', applyBasicSearch);
  inputName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyBasicSearch();
  });

  btnClear?.addEventListener('click', () => {
    if (inputName) inputName.value = '';
    state.advanced = null;
    state.filtered = [...state.companies];
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ?? null;
    if (formAdv) formAdv.reset();
    render();
  });

  btnAdv?.addEventListener('click', () => {
    if (dlgAdv?.showModal) dlgAdv.showModal();
  });

  btnAdvClear?.addEventListener('click', () => {
    formAdv?.reset();
  });

  btnAdvApply?.addEventListener('click', () => {
    const adv = readAdvancedSearch(formAdv);
    state.advanced = adv;
    const name = (inputName?.value ?? '').trim();
    state.filtered = filterCompanies(state.companies, { ...adv, name });
    state.page = 1;
    state.selectedId = state.filtered[0]?.id ?? null;
    dlgAdv?.close();
    render();
  });

  btnCreate?.addEventListener('click', () => {
    const selected = state.companies.find(c => c.id === state.selectedId) || null;
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

  q('companyTableBody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    state.selectedId = tr.getAttribute('data-id');
    render();
  });

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.getAttribute('data-company-tab');
      tabs.forEach(x => x.classList.toggle('active', x === t));
      const panels = document.querySelectorAll('[data-company-panel]');
      panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-company-panel') === tab));

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

  q('btnCompanySave')?.addEventListener('click', () => {
    const selected = state.companies.find(c => c.id === state.selectedId);
    if (!selected) return;
    const next = readDetailForm();
    if (!next.name.trim()) {
      alert('会社名は必須です');
      return;
    }
    Object.assign(selected, next, {
      updatedAt: new Date().toISOString().slice(0, 10).replaceAll('-', '/') + ' 12:00',
      updatedBy: 'admin'
    });
    // refresh current filter results
    const name = (inputName?.value ?? '').trim();
    state.filtered = filterCompanies(state.companies, { ...(state.advanced || null), name });
    render();
  });

  q('btnCompanyDelete')?.addEventListener('click', () => {
    const selected = state.companies.find(c => c.id === state.selectedId);
    if (!selected) return;
    const ok = confirm('削除しますか？（ワイヤーフレーム：関連チェックなし）');
    if (!ok) return;
    state.companies = state.companies.filter(c => c.id !== selected.id);
    state.filtered = state.filtered.filter(c => c.id !== selected.id);
    state.selectedId = state.filtered[0]?.id ?? null;
    render();
  });
}

function render() {
  const tbody = q('companyTableBody');
  const meta = q('companyResultMeta');
  const totalCount = q('companyTotalCount');

  if (meta) meta.textContent = `全 ${state.filtered.length} 件`;
  if (totalCount) totalCount.textContent = state.filtered.length;

  const rows = state.filtered.slice(0, state.pageSize); // simplified for now

  if (tbody) {
    tbody.innerHTML = rows.map(c => `
      <tr data-id="${escapeHtml(c.id)}" class="${c.id === state.selectedId ? 'selected' : ''}">
        <td>${escapeHtml(c.id)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.tel || '')}</td>
        <td>${escapeHtml(c.fax || '')}</td>
        <td>${escapeHtml(c.area || '')}</td>
        <td>${escapeHtml(c.postal || '')}</td>
        <td>${escapeHtml(c.pref || '')}</td>
        <td>${escapeHtml(c.addr || '')}</td>
        <td>${escapeHtml(c.industry || '')}</td>
        <td>${escapeHtml(c.biz || '')}</td>
        <td>${escapeHtml(c.scale || '')}</td>
        <td>${escapeHtml(c.type || '')}</td>
        <td>${escapeHtml(c.corpNo || '')}</td>
        <td>${escapeHtml(c.capital || '')}</td>
        <td>${escapeHtml(c.employees || '')}</td>
        <td>${escapeHtml(c.closingMonth || '')}</td>
        <td>${escapeHtml(c.revenue || '')}</td>
        <td>${c.noDoc ? '禁止' : ''}</td>
        <td>${c.noTel ? '禁止' : ''}</td>
        <td>${escapeHtml(c.free1 || '')}</td>
        <td>${escapeHtml(c.free2 || '')}</td>
        <td>${escapeHtml(c.free3 || '')}</td>
        <td>${escapeHtml(c.remark || '')}</td>
      </tr>
    `).join('');
  }

  const selected = state.companies.find(c => c.id === state.selectedId) || state.filtered[0] || null;
  state.selectedId = selected?.id ?? null;
  fillDetailForm(selected);
  renderChildLists(selected);
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

function readAdvancedSearch(form) {
  if (!form) return {};
  const fd = new FormData(form);
  return {
    keyword: String(fd.get('keyword') || ''),
    name: String(fd.get('name') || ''),
  };
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

function renderChildLists(c) {
  const set = (id, html) => {
    const el = q(id);
    if (el) el.innerHTML = html;
  };
  if (!c) return;

  // Render Contacts
  let contactsHtml = `
    <table class="mini-grid-table">
      <thead><tr><th>担当(姓)</th><th>部署名</th><th>TEL</th><th>役職名</th></tr></thead>
      <tbody>
  `;
  contactsHtml += mockContacts.map(m => `
    <tr><td>${escapeHtml(m.last)}</td><td>${escapeHtml(m.dept)}</td><td>${escapeHtml(m.tel)}</td><td>${escapeHtml(m.pos)}</td></tr>
  `).join('');
  contactsHtml += `</tbody></table>`;
  set('companyContactsList', contactsHtml);

  // Render Activities
  let activitiesHtml = `
    <table class="mini-grid-table">
      <thead><tr><th>活動日</th><th>タイプ</th><th>コメント</th></tr></thead>
      <tbody>
  `;
  activitiesHtml += mockActivities.map(a => `
    <tr><td>${escapeHtml(a.date)}</td><td><span class="${a.typeClass}">${escapeHtml(a.type)}</span></td><td>${escapeHtml(a.comment)}</td></tr>
  `).join('');
  activitiesHtml += `</tbody></table>`;
  set('companyActivitiesList', activitiesHtml);

  // Render Projects
  let projectsHtml = `
    <table class="mini-grid-table">
      <thead><tr><th>話題日</th><th>案件名</th><th>ステータス</th></tr></thead>
      <tbody>
  `;
  projectsHtml += mockProjects.map(p => `
    <tr><td>${escapeHtml(p.issueDate)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.status)}</td></tr>
  `).join('');
  projectsHtml += `</tbody></table>`;
  set('companyProjectsList', projectsHtml);
}
