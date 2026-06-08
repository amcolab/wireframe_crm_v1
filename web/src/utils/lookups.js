import { q, escapeHtml } from './helpers.js';
import { mockCompanies, mockEmployees, mockProjects, mockTenants } from './mockData.js';
import { renderPageNumberButtons } from './pager.js';
import { showToast } from './toast.js';
import { applyCompanyToContactCreateForm, openContactCreateDialog } from './contactCreateForm.js';
import { applyCompanyToActivityCreateForm } from './activityCreateForm.js';
import { applyCompanyToProjectCreateForm } from './projectCreateForm.js';
import { initColumnSettings, openColumnSettingsDialog } from './columnSettings.js';
import { bindAttachFields } from './attachField.js';

function closeShellMenus() {
  document.querySelector('.settings-menu-trigger')?.classList.remove('show-menu');
  q('userMenuTrigger')?.classList.remove('active');
}

function bindResizableDialog({ dialogId, handleId, minWidth, minHeight, maxWidthOffset = 16, maxHeightOffset = 16 }) {
  const dlg = q(dialogId);
  const handle = q(handleId);
  if (!dlg || !handle || dlg.dataset.resizableBound === '1') return;
  dlg.dataset.resizableBound = '1';
  dlg.classList.add('dlg-resizable');

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dlg.offsetWidth;
    const startHeight = dlg.offsetHeight;
    const sessionMinWidth = Math.min(minWidth, startWidth);
    const sessionMinHeight = Math.min(minHeight, startHeight);
    let nextWidth = startWidth;
    let nextHeight = startHeight;
    let rafId = 0;
    let hasDragged = false;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!hasDragged && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      hasDragged = true;

      nextWidth = Math.max(sessionMinWidth, Math.min(window.innerWidth - maxWidthOffset, startWidth + dx));
      nextHeight = Math.max(sessionMinHeight, Math.min(window.innerHeight - maxHeightOffset, startHeight + dy));
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        dlg.style.width = `${Math.round(nextWidth)}px`;
        dlg.style.height = `${Math.round(nextHeight)}px`;
        rafId = 0;
      });
    };

    const onUp = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        dlg.style.width = `${Math.round(nextWidth)}px`;
        dlg.style.height = `${Math.round(nextHeight)}px`;
        rafId = 0;
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

function initResizableMasterDialogs() {
  bindResizableDialog({
    dialogId: 'dlgEmployeeMaster',
    handleId: 'employeeMasterResizeHandle',
    minWidth: 900,
    minHeight: 520,
  });
  bindResizableDialog({
    dialogId: 'dlgGeneralMaster',
    handleId: 'generalMasterResizeHandle',
    minWidth: 700,
    minHeight: 520,
  });
  bindResizableDialog({
    dialogId: 'dlgTenantCompany',
    handleId: 'tenantCompanyResizeHandle',
    minWidth: 860,
    minHeight: 520,
  });
}

export function initGlobalLookups() {
  initColumnSettings();
  initResizableMasterDialogs();
  bindAttachFields([
    'companyCreateAttachList',
    'activityDlgAttachList',
    'projectDlgAttachList',
  ]);

  const GENERAL_MASTER_STORAGE_KEY = 'smos.generalMasters.v1';
  const GENERAL_MASTER_DEFS = [
    { value: 'biz', label: '業種' },
    { value: 'industry', label: '業界' },
    { value: 'scale', label: '規模ランク' },
    { value: 'type', label: '種別' },
    { value: 'role', label: '職種' },
    { value: 'rank', label: '職位' },
    { value: 'motivation', label: '発生動機' },
    { value: 'purpose', label: '活動目的' },
  ];
  const GENERAL_MASTER_DEFAULTS = {
    biz: [
      { name: '機械', remark: '' },
      { name: '電気・電子', remark: '' },
      { name: '食品・飲料', remark: '' },
      { name: '化学・素材', remark: '' },
    ],
    industry: [
      { name: '製造業', remark: '' },
      { name: '情報通信', remark: '' },
      { name: '流通', remark: '' },
    ],
    scale: [
      { name: '1～30名', remark: '' },
      { name: '31～100名', remark: '' },
      { name: '101～300名', remark: '' },
    ],
    type: [
      { name: '新規', remark: '' },
      { name: '既存', remark: '' },
      { name: 'その他', remark: '' },
    ],
    role: [
      { name: '購買', remark: '' },
      { name: '情報システム', remark: '' },
      { name: '経営層', remark: '' },
    ],
    rank: [
      { name: '担当者', remark: '' },
      { name: '係長', remark: '' },
      { name: '課長', remark: '' },
    ],
    motivation: [
      { name: '引合', remark: '' },
      { name: '既存更新', remark: '' },
      { name: '紹介', remark: '' },
    ],
    purpose: [
      { name: '初回ヒアリング', remark: '' },
      { name: '提案', remark: '' },
      { name: 'フォロー', remark: '' },
    ],
  };
  const gmState = {
    selectedType: GENERAL_MASTER_DEFS[0].value,
    selectedIndex: -1,
    showDeleted: false,
    data: null,
  };

  const cloneMaster = (v) => JSON.parse(JSON.stringify(v));
  const gmTypeSelect = q('generalMasterTypeSelect');
  const gmBody = q('generalMasterBody');
  const gmDeleteHeader = q('generalMasterDeleteHeader');
  const gmTable = q('generalMasterTable');

  const readGeneralMasterStore = () => {
    try {
      const raw = localStorage.getItem(GENERAL_MASTER_STORAGE_KEY);
      if (!raw) return cloneMaster(GENERAL_MASTER_DEFAULTS);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad');
      const next = cloneMaster(GENERAL_MASTER_DEFAULTS);
      Object.keys(next).forEach((k) => {
        if (Array.isArray(parsed[k])) {
          next[k] = parsed[k].map((r) => ({
            name: String(r.name ?? ''),
            remark: String(r.remark ?? ''),
            deleted: Boolean(r.deleted),
          }));
        }
      });
      return next;
    } catch {
      return cloneMaster(GENERAL_MASTER_DEFAULTS);
    }
  };

  const writeGeneralMasterStore = () => {
    localStorage.setItem(GENERAL_MASTER_STORAGE_KEY, JSON.stringify(gmState.data));
  };

  const currentRows = () => gmState.data?.[gmState.selectedType] ?? [];

  const visibleRowsWithIndex = () => {
    const rows = currentRows();
    return rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => gmState.showDeleted || !row.deleted);
  };

  const isBlankRow = (row) => !String(row?.name || '').trim() && !String(row?.remark || '').trim();

  const renderGeneralMasterRows = () => {
    if (!gmBody) return;
    ensureGeneralMasterTailRow();
    if (gmDeleteHeader) gmDeleteHeader.style.display = gmState.showDeleted ? '' : 'none';
    const deleteCol = gmTable?.querySelector('colgroup col:last-child');
    if (deleteCol) {
      deleteCol.style.width = gmState.showDeleted ? '68px' : '0px';
    }
    const visible = visibleRowsWithIndex();
    let dragFromPos = -1;
    gmBody.innerHTML = visible.map(({ row, idx }, no) => `
      <tr data-idx="${idx}" data-vpos="${no}" draggable="${(row.deleted || isBlankRow(row)) ? 'false' : 'true'}" class="master-row ${idx === gmState.selectedIndex ? 'selected' : ''} ${row.deleted ? 'is-deleted' : ''} ${isBlankRow(row) ? 'is-blank' : ''}">
        <td class="col-no"><span class="master-row-handle" title="ドラッグして順序変更">${isBlankRow(row) ? '' : '⋮⋮'}</span>${no + 1}</td>
        <td><input type="text" class="master-input-cell" data-field="name" data-idx="${idx}" value="${escapeHtml(row.name)}" ${row.deleted ? 'disabled' : ''}></td>
        <td><input type="text" class="master-input-cell" data-field="remark" data-idx="${idx}" value="${escapeHtml(row.remark)}" ${row.deleted ? 'disabled' : ''}></td>
        ${gmState.showDeleted ? `<td class="col-center"><input type="checkbox" class="master-delete-check" data-idx="${idx}" ${row.deleted ? 'checked' : ''}></td>` : ''}
      </tr>
    `).join('');

    gmBody.querySelectorAll('tr').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.master-input-cell')) return;
        gmState.selectedIndex = Number(tr.dataset.idx);
        renderGeneralMasterRows();
      });
      tr.addEventListener('dragstart', (e) => {
        if (tr.classList.contains('is-deleted')) return;
        dragFromPos = Number(tr.dataset.vpos);
        tr.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      tr.addEventListener('dragend', () => {
        tr.classList.remove('is-dragging');
        gmBody.querySelectorAll('tr').forEach((r) => r.classList.remove('is-drop-target'));
        dragFromPos = -1;
      });
      tr.addEventListener('dragover', (e) => {
        if (dragFromPos < 0) return;
        e.preventDefault();
        tr.classList.add('is-drop-target');
      });
      tr.addEventListener('dragleave', () => {
        tr.classList.remove('is-drop-target');
      });
      tr.addEventListener('drop', (e) => {
        if (dragFromPos < 0) return;
        e.preventDefault();
        const dragToPos = Number(tr.dataset.vpos);
        tr.classList.remove('is-drop-target');
        if (dragToPos === dragFromPos) return;
        const rows = currentRows();
        const currVisible = visibleRowsWithIndex();
        const fromItem = currVisible[dragFromPos];
        const toItem = currVisible[dragToPos];
        if (!fromItem || !toItem) return;
        const fromIdx = fromItem.idx;
        const toIdx = toItem.idx;
        const [moved] = rows.splice(fromIdx, 1);
        const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
        rows.splice(insertIdx, 0, moved);
        gmState.selectedIndex = insertIdx;
        renderGeneralMasterRows();
      });
    });

    gmBody.querySelectorAll('.master-input-cell').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('focus', () => {
        gmState.selectedIndex = Number(input.dataset.idx);
        gmBody.querySelectorAll('tr').forEach((r) => r.classList.remove('selected'));
        input.closest('tr')?.classList.add('selected');
      });
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.idx);
        const field = input.dataset.field;
        const row = currentRows()[idx];
        if (!row || row.deleted) return;
        row[field] = input.value;
        const beforeLen = currentRows().length;
        ensureGeneralMasterTailRow();
        if (currentRows().length > beforeLen) {
          renderGeneralMasterRows();
          const selector = `.master-input-cell[data-idx="${idx}"][data-field="${field}"]`;
          const focusEl = gmBody.querySelector(selector);
          if (focusEl) {
            focusEl.focus();
            const len = focusEl.value.length;
            focusEl.setSelectionRange(len, len);
          }
        }
      });
    });
    if (gmState.showDeleted) {
      gmBody.querySelectorAll('.master-delete-check').forEach((check) => {
        check.addEventListener('click', (e) => e.stopPropagation());
        check.addEventListener('change', () => {
          const idx = Number(check.dataset.idx);
          const row = currentRows()[idx];
          if (!row) return;
          row.deleted = check.checked;
          renderGeneralMasterRows();
        });
      });
    }
  };

  const ensureGeneralMasterTailRow = () => {
    const rows = currentRows();
    const last = rows.filter((r) => !r.deleted).at(-1);
    if (!last || !isBlankRow(last)) {
      rows.push({ name: '', remark: '', deleted: false });
    }
  };

  const openGeneralMasterDialog = () => {
    gmState.data = readGeneralMasterStore();
    Object.keys(gmState.data).forEach((key) => {
      const rows = gmState.data[key];
      if (!rows.length) rows.push({ name: '', remark: '', deleted: false });
      const last = rows.filter((r) => !r.deleted).at(-1);
      if (!last || !isBlankRow(last)) {
        rows.push({ name: '', remark: '', deleted: false });
      }
    });
    gmState.showDeleted = false;
    if (q('chkShowDeletedGeneralMaster')) {
      q('chkShowDeletedGeneralMaster').checked = false;
    }
    gmState.selectedType = gmTypeSelect?.value || gmState.selectedType;
    gmState.selectedIndex = -1;
    renderGeneralMasterRows();
    q('dlgGeneralMaster')?.showModal();
  };

  if (gmTypeSelect && !gmTypeSelect.dataset.bound) {
    gmTypeSelect.dataset.bound = '1';
    gmTypeSelect.innerHTML = GENERAL_MASTER_DEFS
      .map((x) => `<option value="${x.value}">${escapeHtml(x.label)}</option>`)
      .join('');
    gmTypeSelect.value = gmState.selectedType;
    gmTypeSelect.addEventListener('change', () => {
      gmState.selectedType = gmTypeSelect.value;
      gmState.selectedIndex = -1;
      renderGeneralMasterRows();
    });
  }

  q('menuGeneralMaster')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    openGeneralMasterDialog();
  });
  q('chkShowDeletedGeneralMaster')?.addEventListener('change', (e) => {
    gmState.showDeleted = Boolean(e.target.checked);
    gmState.selectedIndex = -1;
    renderGeneralMasterRows();
  });
  q('btnGeneralMasterDeleteRow')?.addEventListener('click', () => {
    const rows = currentRows();
    if (!rows.length) {
      return;
    }
    if (gmState.showDeleted) {
      // In "show deleted" mode, mark the nearest last active row as deleted.
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i];
        if (!row) continue;
        if (row.deleted) continue;
        if (isBlankRow(row)) continue;
        row.deleted = true;
        gmState.selectedIndex = i;
        renderGeneralMasterRows();
        return;
      }
      return;
    }
    const visible = visibleRowsWithIndex();
    if (!visible.length) return;

    // Keep one trailing blank row UX; delete the last meaningful row first.
    let targetPos = visible.length - 1;
    if (isBlankRow(visible[targetPos].row) && visible.length > 1) {
      targetPos -= 1;
    }
    rows.splice(visible[targetPos].idx, 1);
    ensureGeneralMasterTailRow();
    gmState.selectedIndex = -1;
    renderGeneralMasterRows();
  });
  q('btnGeneralMasterSave')?.addEventListener('click', () => {
    if (!gmState.data) return;
    Object.keys(gmState.data).forEach((key) => {
      // Soft-delete: keep deleted rows for later restore/view.
      const rows = gmState.data[key];
      // Remove excessive blank active rows but keep single trailing blank row.
      const active = rows.filter((r) => !r.deleted);
      const compactActive = [];
      active.forEach((row) => {
        if (isBlankRow(row)) return;
        compactActive.push(row);
      });
      const deleted = rows.filter((r) => r.deleted);
      gmState.data[key] = [...compactActive, ...deleted, { name: '', remark: '', deleted: false }];
    });
    writeGeneralMasterStore();
    showToast('登録が完了しました', 'success');
    q('dlgGeneralMaster')?.close();
  });

  // Employee Master Logic
  const dlgEmployee = q('dlgEmployeeMaster');
  const employeeTbody = q('employeeMasterBody');

  const renderEmployeeMaster = (data = mockEmployees) => {
    if (!employeeTbody) return;
    employeeTbody.innerHTML = data.map((emp, index) => `
      <tr data-id="${escapeHtml(emp.id)}">
        <td class="col-no">${index + 1}</td>
        <td>${escapeHtml(emp.id)}</td>
        <td class="blue-link">${escapeHtml(emp.name)}</td>
        <td>${escapeHtml(emp.kana)}</td>
        <td>${escapeHtml(emp.dept)}</td>
        <td>${escapeHtml(emp.group)}</td>
        <td>${escapeHtml(emp.login)}</td>
        <td>${escapeHtml(emp.password)}</td>
      </tr>
    `).join('');

    employeeTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        employeeTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
      });
    });
  };

  q('menuEmployeeMaster')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    dlgEmployee?.showModal();
    renderEmployeeMaster();
  });

  q('btnEmployeeSearch')?.addEventListener('click', () => {
    const name = q('employeeSearchName')?.value.toLowerCase();
    const filtered = mockEmployees.filter(emp => emp.name.toLowerCase().includes(name));
    renderEmployeeMaster(filtered);
  });

  q('btnEmployeeDeleteRow')?.addEventListener('click', () => {
    const selected = employeeTbody.querySelector('tr.selected');
    if (selected) {
      if (confirm('選択した行を削除しますか？')) {
        selected.remove();
      }
    } else {
      alert('削除する行を選択してください');
    }
  });

  q('btnEmployeeSave')?.addEventListener('click', () => {
    alert('登録が完了しました');
    dlgEmployee?.close();
  });

  q('btnEmployeeGroup')?.addEventListener('click', () => {
    const selected = employeeTbody.querySelector('tr.selected');
    if (selected) {
      const loginId = selected.querySelectorAll('td')[6].textContent;
      const secLogin = q('secLoginId');
      if (secLogin) secLogin.value = loginId;

      // Update checkboxes based on group
      const group = selected.querySelectorAll('td')[5].textContent;
      q('chkGroupAdmin').checked = group === '管理者';
      q('chkGroupUser').checked = group === '一般ユーザー';

      q('dlgSecurityMaster')?.showModal();
    } else {
      alert('社員を選択してください');
    }
  });

  q('menuPasswordChange')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    q('dlgPasswordChange')?.showModal();
  });

  q('btnPasswordSave')?.addEventListener('click', () => {
    const cur = q('pwdCurrent')?.value;
    const neu = q('pwdNew')?.value;
    const conf = q('pwdConfirm')?.value;
    if (!cur || !neu || !conf) {
      alert('すべての項目を入力してください');
      return;
    }
    if (neu !== conf) {
      alert('新しいパスワードが一致しません');
      return;
    }
    alert('パスワードを変更しました');
    q('dlgPasswordChange')?.close();
  });

  q('btnSecuritySave')?.addEventListener('click', () => {
    alert('登録が完了しました');
    q('dlgSecurityMaster')?.close();
  });

  q('btnEmployeeNew')?.addEventListener('click', () => {
    q('dlgEmployeeDetail')?.showModal();
  });

  q('btnSaveEmployeeDetail')?.addEventListener('click', () => {
    alert('保存しました');
    q('dlgEmployeeDetail')?.close();
  });

  // Tenant Master Logic (System Admin Only)
  const renderTenants = () => {
    const tbody = q('tenantCompanyBody');
    if (!tbody) return;
    tbody.innerHTML = mockTenants.map(t => `
      <tr data-id="${escapeHtml(t.id)}">
        <td class="blue-link">${escapeHtml(t.id)}</td>
        <td>${escapeHtml(t.name)}</td>
        <td><code class="tenant-code">${escapeHtml(t.loginCode)}</code></td>
        <td class="col-center">
          <select class="input status-select ${t.isActive ? 'status-active' : 'status-inactive'}" data-id="${escapeHtml(t.id)}">
            <option value="true" ${t.isActive ? 'selected' : ''}>有効</option>
            <option value="false" ${!t.isActive ? 'selected' : ''}>無効</option>
          </select>
        </td>
        <td class="text-muted">${escapeHtml(t.createdAt)}</td>
        <td class="col-center">
          <button type="button" class="btn btn-secondary btn-sm btnCreateTenantUser" data-id="${escapeHtml(t.id)}">+ ユーザー作成</button>
        </td>
      </tr>
    `).join('');

    // Bind click events to status change
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const val = sel.value === 'true';
        sel.classList.toggle('status-active', val);
        sel.classList.toggle('status-inactive', !val);
      });
    });

    // Bind click events to new buttons
    tbody.querySelectorAll('.btnCreateTenantUser').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tenantId = btn.dataset.id;
        const tenantName = mockTenants.find(t => t.id === tenantId)?.name;

        // Show detail modal and maybe pre-fill some info
        q('dlgEmployeeDetail')?.showModal();

        // Optional: Pre-fill some context if needed
        const title = q('dlgEmployeeDetail').querySelector('.dlg-title');
        if (title) title.textContent = `${tenantName} - 管理ユーザー作成`;
      });
    });
  };

  q('menuColumnSettings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    openColumnSettingsDialog();
  });

  q('menuTenantCompany')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShellMenus();
    renderTenants();
    q('dlgTenantCompany')?.showModal();
  });

  q('btnTenantNew')?.addEventListener('click', () => {
    q('dlgTenantDetail')?.showModal();
  });

  q('btnSaveTenantDetail')?.addEventListener('click', () => {
    alert('新しいテナントを有効化しました。');
    q('dlgTenantDetail')?.close();
  });
  const updateMultiSelectTrigger = (dropdown) => {
    if (!dropdown) return;
    const trigger = dropdown.querySelector('.multi-select-trigger');
    const placeholder = dropdown.dataset.placeholder || '選択..';
    if (!trigger) return;
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    const selected = Array.from(checkboxes)
      .filter((c) => c.checked)
      .map((c) => c.parentElement?.textContent?.trim() || c.value);

    if (selected.length === 0) {
      trigger.textContent = placeholder;
    } else if (selected.length <= 2) {
      trigger.textContent = selected.join(', ');
    } else {
      trigger.textContent = `${selected.length}項目選択中`;
    }
  };

  const closeMultiSelectPanels = () => {
    document.querySelectorAll('.multi-select-dropdown.active').forEach((d) => {
      d.classList.remove('active');
      const panel = d.querySelector('.multi-select-content');
      if (panel) {
        panel.classList.remove('is-fixed');
        panel.style.position = '';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.width = '';
        panel.style.right = '';
      }
    });
  };

  const positionMultiSelectPanel = (dropdown) => {
    const trigger = dropdown.querySelector('.multi-select-trigger');
    const panel = dropdown.querySelector('.multi-select-content');
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    panel.classList.add('is-fixed');
    panel.style.position = 'fixed';
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.width = `${rect.width}px`;
    panel.style.right = 'auto';
  };

  const initMultiSelects = () => {
    document.querySelectorAll('.multi-select-dropdown').forEach(updateMultiSelectTrigger);
  };

  if (!window.__multiSelectDelegationBound) {
    window.__multiSelectDelegationBound = true;

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.multi-select-trigger');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = trigger.closest('.multi-select-dropdown');
        if (!dropdown) return;
        const wasActive = dropdown.classList.contains('active');
        closeMultiSelectPanels();
        if (!wasActive) {
          dropdown.classList.add('active');
          positionMultiSelectPanel(dropdown);
        }
        return;
      }

      if (e.target.closest('.multi-select-dropdown')) return;
      closeMultiSelectPanels();
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('.multi-select-dropdown input[type="checkbox"]')) {
        updateMultiSelectTrigger(e.target.closest('.multi-select-dropdown'));
      }
    });

    window.addEventListener('resize', closeMultiSelectPanels);
    window.addEventListener(
      'scroll',
      () => {
        const active = document.querySelector('.multi-select-dropdown.active');
        if (!active) return;
        positionMultiSelectPanel(active);
      },
      true
    );
  }

  initMultiSelects();

  // Company Lookup state
  const dlgLookup = q('dlgCompanyLookup');
  dlgLookup?.addEventListener('close', closeMultiSelectPanels);
  q('dlgCompanyAdvancedSearch')?.addEventListener('close', closeMultiSelectPanels);
  const lookupTbody = q('lookupCompanyBody');
  const dlgContactLookup = q('dlgContactLookup');
  const contactLookupTbody = q('contactLookupBody') || document.querySelector('.contact-table tbody');
  const dlgProjectLookup = q('dlgProjectLookup');
  const projectLookupTbody = q('projectLookupBody') || document.querySelector('.project-table tbody');
  let tempLookupSelection = null;
  let tempContactSelection = null;
  let tempProjectSelection = null;

  let lookupState = {
    page: 1,
    pageSize: 100,
    filtered: [...mockCompanies]
  };

  const renderLookupResults = (filters = null) => {
    if (!lookupTbody) return;

    if (filters) {
      lookupState.filtered = mockCompanies.filter(c => {
        if (filters.name && !c.name.includes(filters.name)) return false;
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
        }
        return true;
      });
      lookupState.page = 1;
    }

    const total = lookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / lookupState.pageSize));
    if (lookupState.page > totalPages) lookupState.page = totalPages;

    const startIdx = (lookupState.page - 1) * lookupState.pageSize;
    const endIdx = Math.min(startIdx + lookupState.pageSize, total);
    const rows = lookupState.filtered.slice(startIdx, endIdx);

    lookupTbody.innerHTML = rows.map(c => `
      <tr data-id="${c.id}" class="${tempLookupSelection?.id === c.id ? 'selected' : ''}">
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.tel || ''}</td>
        <td>${c.addr || ''}</td>
        <td>${c.industry || ''}</td>
        <td>${c.biz || ''}</td>
        <td>${c.scale || ''}</td>
        <td>${c.type || ''}</td>
        <td>${c.employees || '0'}</td>
        <td>${c.area || ''}</td>
        <td>${c.pref || ''}</td>
        <td>${c.remark || ''}</td>
      </tr>
    `).join('');

    // Bind selection
    lookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        lookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        tempLookupSelection = lookupState.filtered.find(c => c.id === id);
      });
    });

    // Update Pager UI
    const totalCountEl = q('lookupTotalCount');
    const rangeStartEl = q('lookupRangeStart');
    const rangeEndEl = q('lookupRangeEnd');
    const pageTotalEl = q('lookupPageTotal');
    const pageSelect = q('lookupPageSelect');
    const pageNumbers = q('lookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === lookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      renderPageNumberButtons(pageNumbers, lookupState.page, totalPages, (p) => {
        lookupState.page = p;
        renderLookupResults();
      });
    }
  };

  // Bind Pager Buttons
  q('btnLookupFirstPage')?.addEventListener('click', () => { lookupState.page = 1; renderLookupResults(); });
  q('btnLookupPrevPage')?.addEventListener('click', () => { if (lookupState.page > 1) { lookupState.page--; renderLookupResults(); } });
  q('btnLookupNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(lookupState.filtered.length / lookupState.pageSize);
    if (lookupState.page < totalPages) { lookupState.page++; renderLookupResults(); }
  });
  q('btnLookupLastPage')?.addEventListener('click', () => {
    lookupState.page = Math.ceil(lookupState.filtered.length / lookupState.pageSize);
    renderLookupResults();
  });

  q('lookupPageSelect')?.addEventListener('change', (e) => {
    lookupState.page = parseInt(e.target.value) || 1;
    renderLookupResults();
  });

  q('lookupPageSize')?.addEventListener('change', (e) => {
    lookupState.pageSize = parseInt(e.target.value) || 100;
    lookupState.page = 1;
    renderLookupResults();
  });

  // Contact Lookup state
  let contactLookupState = {
    page: 1,
    pageSize: 100,
    filtered: [...(window.mockContacts || [])]
  };

  // Import mockContacts if not globally available
  import('./mockData.js').then(m => {
    contactLookupState.filtered = [...m.mockContacts];
  });

  const renderContactLookupResults = (filters = null) => {
    if (!contactLookupTbody) return;

    if (filters) {
      import('./mockData.js').then(m => {
        contactLookupState.filtered = m.mockContacts.filter(c => {
          if (filters.name && !`${c.last}${c.first}`.includes(filters.name)) return false;
          if (filters.keyword) {
            const kw = filters.keyword.toLowerCase();
            return Object.values(c).some(val => String(val).toLowerCase().includes(kw));
          }
          return true;
        });
        contactLookupState.page = 1;
        renderContactLookupResults();
      });
      return;
    }

    const total = contactLookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / contactLookupState.pageSize));
    if (contactLookupState.page > totalPages) contactLookupState.page = totalPages;

    const startIdx = (contactLookupState.page - 1) * contactLookupState.pageSize;
    const endIdx = Math.min(startIdx + contactLookupState.pageSize, total);
    const rows = contactLookupState.filtered.slice(startIdx, endIdx);

    contactLookupTbody.innerHTML = rows.map(c => `
      <tr data-id="${c.last}-${c.first}" class="${tempContactSelection?.last === c.last && tempContactSelection?.first === c.first ? 'selected' : ''}">
        <td>${c.companyId || ''}</td>
        <td>${c.company || ''}</td>
        <td>${c.dept || ''}</td>
        <td>${c.last}</td>
        <td>${c.first}</td>
        <td>${c.kana || ''}</td>
        <td>${c.tel || ''}</td>
        <td>${c.mobile || ''}</td>
      </tr>
    `).join('');

    // Bind selection
    contactLookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        contactLookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        const [last, first] = id.split('-');
        tempContactSelection = contactLookupState.filtered.find(c => c.last === last && c.first === first);
      });
    });

    // Update Pager UI
    const totalCountEl = q('contactLookupTotalCount');
    const rangeStartEl = q('contactLookupRangeStart');
    const rangeEndEl = q('contactLookupRangeEnd');
    const pageTotalEl = q('contactLookupPageTotal');
    const pageSelect = q('contactLookupPageSelect');
    const pageNumbers = q('contactLookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === contactLookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      renderPageNumberButtons(pageNumbers, contactLookupState.page, totalPages, (p) => {
        contactLookupState.page = p;
        renderContactLookupResults();
      });
    }
  };

  // Bind Pager Buttons for Contact Lookup
  q('btnContactLookupFirstPage')?.addEventListener('click', () => { contactLookupState.page = 1; renderContactLookupResults(); });
  q('btnContactLookupPrevPage')?.addEventListener('click', () => { if (contactLookupState.page > 1) { contactLookupState.page--; renderContactLookupResults(); } });
  q('btnContactLookupNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(contactLookupState.filtered.length / contactLookupState.pageSize);
    if (contactLookupState.page < totalPages) { contactLookupState.page++; renderContactLookupResults(); }
  });
  q('btnContactLookupLastPage')?.addEventListener('click', () => {
    contactLookupState.page = Math.ceil(contactLookupState.filtered.length / contactLookupState.pageSize);
    renderContactLookupResults();
  });

  q('contactLookupPageSelect')?.addEventListener('change', (e) => {
    contactLookupState.page = parseInt(e.target.value) || 1;
    renderContactLookupResults();
  });

  q('contactLookupPageSize')?.addEventListener('change', (e) => {
    contactLookupState.pageSize = parseInt(e.target.value) || 100;
    contactLookupState.page = 1;
    renderContactLookupResults();
  });

  // Auto-render on dialog open
  if (dlgLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgLookup.open) {
          renderLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgLookup, { attributes: true });
  }

  if (dlgContactLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgContactLookup.open) {
          renderContactLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgContactLookup, { attributes: true });
  }

  // Project Lookup state
  let projectLookupState = {
    page: 1,
    pageSize: 100,
    filtered: []
  };

  const renderProjectLookupResults = (filters = null) => {
    if (!projectLookupTbody) return;

    if (filters) {
      import('./mockData.js').then(m => {
        projectLookupState.filtered = m.mockProjects.filter(p => {
          if (filters.name && !p.name.includes(filters.name)) return false;
          // Add more filters as needed
          return true;
        });
        projectLookupState.page = 1;
        renderProjectLookupResults();
      });
      return;
    }

    if (projectLookupState.filtered.length === 0) {
      import('./mockData.js').then(m => {
        projectLookupState.filtered = [...m.mockProjects];
        renderProjectLookupResults();
      });
      return;
    }

    const total = projectLookupState.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / projectLookupState.pageSize));
    if (projectLookupState.page > totalPages) projectLookupState.page = totalPages;

    const startIdx = (projectLookupState.page - 1) * projectLookupState.pageSize;
    const endIdx = Math.min(startIdx + projectLookupState.pageSize, total);
    const rows = projectLookupState.filtered.slice(startIdx, endIdx);

    projectLookupTbody.innerHTML = rows.map(p => `
      <tr data-id="${p.id}" class="${tempProjectSelection?.id === p.id ? 'selected' : ''}">
        <td>${p.issueDate || ''}</td>
        <td>${p.followDate || ''}</td>
        <td><span class="status-badge ${p.status === '受注' ? 'status-won' : 'status-lost'}">${p.status}</span></td>
        <td>${p.rep || ''}</td>
        <td>${p.company || ''}</td>
        <td>${p.contact || ''}</td>
        <td class="text-link">${p.name}</td>
        <td class="text-muted text-truncate" style="max-width: 200px;">${p.summary || ''}</td>
        <td>${p.stage1 || '-'}</td>
        <td>${p.stage2 || '-'}</td>
        <td>${p.stage3 || '-'}</td>
        <td>${p.stage4 || '-'}</td>
        <td>${p.motivation || ''}</td>
        <td>${p.method || ''}</td>
        <td>${p.competitor || '-'}</td>
        <td>${p.initial || ''}</td>
        <td>${p.revised || '-'}</td>
        <td>${p.free1 || '-'}</td>
        <td>${p.free2 || '-'}</td>
        <td>${p.free3 || '-'}</td>
      </tr>
    `).join('');

    // Bind selection
    projectLookupTbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        projectLookupTbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        tempProjectSelection = projectLookupState.filtered.find(p => p.id === id);
      });
    });

    // Update Pager UI
    const totalCountEl = q('projectLookupTotalCount');
    const rangeStartEl = q('projectLookupRangeStart');
    const rangeEndEl = q('projectLookupRangeEnd');
    const pageTotalEl = q('projectLookupPageTotal');
    const pageSelect = q('projectLookupPageSelect');
    const pageNumbers = q('projectLookupPageNumbers');

    if (totalCountEl) totalCountEl.textContent = total;
    if (rangeStartEl) rangeStartEl.textContent = total > 0 ? (startIdx + 1) : 0;
    if (rangeEndEl) rangeEndEl.textContent = endIdx;
    if (pageTotalEl) pageTotalEl.textContent = `/ ${totalPages}`;

    if (pageSelect) {
      pageSelect.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if (i === projectLookupState.page) opt.selected = true;
        pageSelect.appendChild(opt);
      }
    }

    if (pageNumbers) {
      renderPageNumberButtons(pageNumbers, projectLookupState.page, totalPages, (p) => {
        projectLookupState.page = p;
        renderProjectLookupResults();
      });
    }
  };

  // Bind Pager Buttons for Project Lookup
  q('btnProjectLookupFirstPage')?.addEventListener('click', () => { projectLookupState.page = 1; renderProjectLookupResults(); });
  q('btnProjectLookupPrevPage')?.addEventListener('click', () => { if (projectLookupState.page > 1) { projectLookupState.page--; renderProjectLookupResults(); } });
  q('btnProjectLookupNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(projectLookupState.filtered.length / projectLookupState.pageSize);
    if (projectLookupState.page < totalPages) { projectLookupState.page++; renderProjectLookupResults(); }
  });
  q('btnProjectLookupLastPage')?.addEventListener('click', () => {
    projectLookupState.page = Math.ceil(projectLookupState.filtered.length / projectLookupState.pageSize);
    renderProjectLookupResults();
  });

  q('projectLookupPageSelect')?.addEventListener('change', (e) => {
    projectLookupState.page = parseInt(e.target.value) || 1;
    renderProjectLookupResults();
  });

  q('projectLookupPageSize')?.addEventListener('change', (e) => {
    projectLookupState.pageSize = parseInt(e.target.value) || 100;
    projectLookupState.page = 1;
    renderProjectLookupResults();
  });

  if (dlgProjectLookup) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open' && dlgProjectLookup.open) {
          renderProjectLookupResults();
          initMultiSelects();
        }
      });
    });
    observer.observe(dlgProjectLookup, { attributes: true });
  }

  // Helper to bind modal triggers
  const bindModalTrigger = (btnId, dlgId) => {
    q(btnId)?.addEventListener('click', () => {
      q(dlgId)?.showModal();
    });
  };

  // Bind lookup/new buttons inside other modals or screens
  const modalTriggers = [
    ['btnContactCompanyLookup', 'dlgCompanyLookup'],
    ['btnContactCompanyNew', 'dlgCompanyCreate'],
    ['btnActivityContactLookup', 'dlgContactLookup'],
    ['btnProjectContactLookup', 'dlgContactLookup'],
    ['btnActivityProjectLookup', 'dlgProjectLookup'],
    ['btnMainContactLookupCompany', 'dlgCompanyLookup'], // For main screen
    ['btnMainContactCreateCompany', 'dlgCompanyCreate']  // For main screen
  ];

  modalTriggers.forEach(([btn, dlg]) => bindModalTrigger(btn, dlg));

  q('btnActivityContactNew')?.addEventListener('click', (e) => {
    e.preventDefault();
    openContactCreateDialog();
  });
  q('btnProjectContactNew')?.addEventListener('click', (e) => {
    e.preventDefault();
    openContactCreateDialog();
  });

  q('btnLookupSearch')?.addEventListener('click', (e) => {
    e.preventDefault();
    const form = q('formCompanyLookup');
    if (!form) return;
    const filters = {
      name: form.name?.value,
      keyword: form.keyword?.value
    };
    renderLookupResults(filters);
  });

  q('btnLookupClear')?.addEventListener('click', (e) => {
    const form = q('formCompanyLookup');
    if (form) form.reset();
    renderLookupResults({});
  });

  q('btnLookupSelect')?.addEventListener('click', () => {
    if (!tempLookupSelection) {
      alert('会社を選択してください');
      return;
    }
    const c = tempLookupSelection;
    const fields = [
      'contactNewCompanyName',
      'contactDetailCompanyName',
      'mainContactCompanyName',
      'atDetailCompanyName',
      'prDetailCompanyName',
      'companySearchCompany',
    ];
    fields.forEach(id => {
      const el = q(id);
      if (el) el.value = c.name;
    });
    applyCompanyToContactCreateForm(c, undefined, { fillExt: false, fillAudit: false });
    applyCompanyToActivityCreateForm(c);
    applyCompanyToProjectCreateForm(c);
    dlgLookup?.close();
  });

  // Global search history trigger
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-search-history')) {
      e.preventDefault();
      const historyBody = q('searchHistoryBody');
      if (historyBody && historyBody.children.length === 0) {
        historyBody.innerHTML = `
          <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
            <td style="padding: 14px; text-align: center; color: #64748b; font-weight: 500;">1</td>
            <td style="padding: 14px; font-weight: 500; cursor: pointer; color: #1e293b;">(新しい条件)</td>
            <td style="padding: 14px; text-align: center;">
              <button type="button" class="btn" style="padding: 4px 12px; font-size: 13px; border: 1px solid #ccc; background: #fff; border-radius: 4px; color: #333;">編集</button>
            </td>
          </tr>
        `;
      }
      q('dlgSearchHistory')?.showModal();
    }
  });
}
