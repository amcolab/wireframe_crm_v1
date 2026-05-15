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

let isReady = false;

export function init() {
  console.log('Company screen initialized');
  if (!isReady) {
    bindUi();
    initResizer();
    isReady = true;
  }
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

  // Multi-select dropdown logic
  document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.multi-select-trigger');
    const content = dropdown.querySelector('.multi-select-content');
    const placeholder = dropdown.dataset.placeholder || '選択..';

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
      });
      dropdown.classList.toggle('active');
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(checkboxes)
          .filter(c => c.checked)
          .map(c => c.parentElement.textContent.trim());
        
        if (selected.length === 0) {
          trigger.textContent = placeholder;
        } else if (selected.length <= 2) {
          trigger.textContent = selected.join(', ');
        } else {
          trigger.textContent = `${selected.length}項目選択中`;
        }
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.multi-select-dropdown').forEach(d => {
      d.classList.remove('active');
    });
  });

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
    document.querySelectorAll('.multi-select-trigger').forEach(trigger => {
      const dropdown = trigger.closest('.multi-select-dropdown');
      trigger.textContent = dropdown.dataset.placeholder || '選択..';
    });
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
}

function render() {
  const tbody = q('companyTableBody');
  const meta = q('companyResultMeta');
  const totalCount = q('companyTotalCount');
  const pageNumbers = q('companyPageNumbers');
  const pageSelect = q('companyPageSelect');
  const pageTotal = q('companyPageTotal');
  const rangeStart = q('companyRangeStart');
  const rangeEnd = q('companyRangeEnd');

  const total = state.filtered.length;
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

  // Render Pager Buttons
  if (pageNumbers) {
    pageNumbers.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.className = `page-num-btn ${p === state.page ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => {
        state.page = p;
        render();
      };
      pageNumbers.appendChild(btn);
    }
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

  const rows = state.filtered.slice(start, actualEndIdx);

  if (tbody) {
    tbody.innerHTML = rows.map(c => `
      <tr data-id="${escapeHtml(c.id)}" class="${c.id === state.selectedId ? 'selected' : ''}">
        <td>${escapeHtml(c.id)}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.tel || '')}</td>
        <td>${escapeHtml(c.addr || '')}</td>
        <td>${escapeHtml(c.industry || '')}</td>
        <td>${escapeHtml(c.biz || '')}</td>
        <td>${escapeHtml(c.scale || '')}</td>
        <td>${escapeHtml(c.type || '')}</td>
        <td>${escapeHtml(c.employees || '')}</td>
        <td>${escapeHtml(c.area || '')}</td>
        <td>${escapeHtml(c.pref || '')}</td>
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
    <div class="mini-table-wrapper">
      <table class="mini-grid-table">
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
  contactsHtml += mockContacts.map(m => `
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
  contactsHtml += `</tbody></table></div>`;
  set('companyContactsList', contactsHtml);

  // Render Activities
  let activitiesHtml = `
    <div class="mini-table-wrapper">
      <table class="mini-grid-table">
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
  activitiesHtml += mockActivities.map(a => `
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
  activitiesHtml += `</tbody></table></div>`;
  set('companyActivitiesList', activitiesHtml);

  // Render Projects
  let projectsHtml = `
    <div class="mini-table-wrapper">
      <table class="mini-grid-table">
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
  projectsHtml += mockProjects.map(p => `
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
  projectsHtml += `</tbody></table></div>`;
  set('companyProjectsList', projectsHtml);
}

function initResizer() {
  const resizer = q('company-resizer');
  const container = document.querySelector('.company-main');
  
  if (!resizer || !container) return;
  
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
    
    // Constraints: min height for grid and detail
    const minGridHeight = 150;
    const minDetailHeight = 200;
    const maxHeight = containerRect.height - minDetailHeight;
    
    let newHeight = relativeY - 6; // Center the resizer (12px / 2)
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
    }
  });
}
