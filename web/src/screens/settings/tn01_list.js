import { q, escapeHtml, includesPartial } from '../../utils/helpers.js';
import { mockTenants } from '../../utils/mockData.js';
import { renderPageNumberButtons } from '../../utils/pager.js';

const EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12s4-7.5 10.5-7.5c2 0 3.7.45 5.1 1.1"/><path d="M22.5 12s-1.55 2.9-4.6 5"/><path d="m6.5 6.5 11 11"/><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"/></svg>';
const PASSWORD_MASK = '********';

let state = {
  tenants: [...mockTenants],
  filtered: [...mockTenants],
  page: 1,
  pageSize: 50,
};

let currentAdminPassword = '';

function getDisplayRows() {
  return state.filtered;
}

function applySearch() {
  const idQ = q('tenantSearchId')?.value?.trim() || '';
  const nameQ = q('tenantSearchName')?.value?.trim() || '';
  const statusQ = q('tenantSearchStatus')?.value ?? '';

  state.filtered = state.tenants.filter((t) => {
    if (idQ && !includesPartial(t.id, idQ)) return false;
    if (nameQ && !includesPartial(t.name, nameQ)) return false;
    if (statusQ === 'true' && !t.isActive) return false;
    if (statusQ === 'false' && t.isActive) return false;
    return true;
  });
  state.page = 1;
  render();
}

function resetTenantCreateForm() {
  const form = q('formTenantDetail');
  form?.reset();
  if (q('tenantDetailActive')) q('tenantDetailActive').checked = true;
  const title = q('dlgTenantDetail')?.querySelector('.dlg-title');
  if (title) title.textContent = 'テナント登録・編集';
}

function openTenantCreateDialog() {
  resetTenantCreateForm();
  q('dlgTenantDetail')?.showModal();
}

function nextTenantId() {
  const nums = state.tenants
    .map((t) => Number(String(t.id).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `T${String(next).padStart(3, '0')}`;
}

function formatNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${min}`;
}

function setReadonlyField(id, value) {
  const el = q(id);
  if (!el) return;
  if (el.tagName === 'SELECT') {
    el.value = value ?? '';
    return;
  }
  el.value = value ?? '';
}

function setPasswordFieldVisible(visible) {
  const input = q('tenantAdminPassword');
  const btn = q('btnTenantAdminTogglePw');
  if (!input || !btn) return;

  const hasPassword = !!currentAdminPassword;
  input.type = visible && hasPassword ? 'text' : 'password';
  input.value = visible && hasPassword ? currentAdminPassword : (hasPassword ? PASSWORD_MASK : '—');
  input.dataset.visible = visible ? '1' : '0';

  btn.innerHTML = visible ? EYE_OFF : EYE_ON;
  const label = visible ? 'パスワードを非表示' : 'パスワードを表示';
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
  btn.disabled = !hasPassword;
}

function resetPasswordField(password) {
  currentAdminPassword = password || '';
  setPasswordFieldVisible(false);
}

function openTenantAdminAccountDialog(tenant) {
  if (!tenant?.adminUser) return;

  const admin = tenant.adminUser;
  const title = q('tenantAdminDlgTitle');
  if (title) title.textContent = `${tenant.name} - 初期管理ユーザー`;

  setReadonlyField('tenantAdminTenantId', tenant.id);
  setReadonlyField('tenantAdminCompanyName', tenant.name);
  setReadonlyField('tenantAdminCode', admin.code);
  setReadonlyField('tenantAdminName', admin.name);
  setReadonlyField('tenantAdminKana', admin.kana);
  setReadonlyField('tenantAdminDept', admin.dept);
  setReadonlyField('tenantAdminGroup', admin.group);
  setReadonlyField('tenantAdminLogin', admin.login);
  resetPasswordField(admin.password);
  setReadonlyField('tenantAdminCreatedAt', admin.createdAt);

  q('dlgTenantAdminAccount')?.showModal();
}

function saveTenantCreate() {
  const name = q('tenantDetailName')?.value?.trim() || '';
  const code = q('tenantDetailCode')?.value?.trim() || '';
  const isActive = q('tenantDetailActive')?.checked ?? true;

  if (!name || !code) {
    alert('すべての項目を入力してください');
    return;
  }

  const tenant = {
    id: nextTenantId(),
    name,
    loginCode: code,
    isActive,
    createdAt: formatNow(),
  };
  state.tenants.unshift(tenant);
  applySearch();
  q('dlgTenantDetail')?.close();
  alert('新しいテナントを有効化しました。');
}

function bindTableActions() {
  const tbody = q('tenantCompanyBody');
  if (!tbody || tbody.dataset.bound === '1') return;
  tbody.dataset.bound = '1';

  tbody.addEventListener('change', (e) => {
    const sel = e.target.closest('.status-select');
    if (!sel) return;
    const tenant = state.tenants.find((t) => t.id === sel.dataset.id);
    if (!tenant) return;
    tenant.isActive = sel.value === 'true';
    sel.classList.toggle('status-active', tenant.isActive);
    sel.classList.toggle('status-inactive', !tenant.isActive);
  });

  tbody.addEventListener('click', (e) => {
    const adminBtn = e.target.closest('.btnViewTenantAdmin');
    if (adminBtn) {
      const tenant = state.tenants.find((t) => t.id === adminBtn.dataset.id);
      if (tenant) openTenantAdminAccountDialog(tenant);
      return;
    }

    const btn = e.target.closest('.btnCreateTenantUser');
    if (!btn) return;
    const tenantId = btn.dataset.id;
    const tenantName = state.tenants.find((t) => t.id === tenantId)?.name;
    q('dlgEmployeeDetail')?.showModal();
    const title = q('dlgEmployeeDetail')?.querySelector('.dlg-title');
    if (title) title.textContent = `${tenantName} - 管理ユーザー作成`;
  });
}

function bindUi() {
  const root = q('tenant-root');
  if (root?.dataset.bound === '1') return;
  root.dataset.bound = '1';

  q('btnTenantSearch')?.addEventListener('click', applySearch);
  q('btnTenantClear')?.addEventListener('click', () => {
    if (q('tenantSearchId')) q('tenantSearchId').value = '';
    if (q('tenantSearchName')) q('tenantSearchName').value = '';
    if (q('tenantSearchStatus')) q('tenantSearchStatus').value = '';
    state.filtered = [...state.tenants];
    state.page = 1;
    render();
  });

  ['tenantSearchId', 'tenantSearchName'].forEach((id) => {
    q(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applySearch();
    });
  });
  q('tenantSearchStatus')?.addEventListener('change', applySearch);

  q('btnTenantNew')?.addEventListener('click', openTenantCreateDialog);

  const saveBtn = q('btnSaveTenantDetail');
  if (saveBtn && saveBtn.dataset.bound !== '1') {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', saveTenantCreate);
  }

  q('btnTenantFirstPage')?.addEventListener('click', () => { state.page = 1; render(); });
  q('btnTenantPrevPage')?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; render(); }
  });
  q('btnTenantNextPage')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(getDisplayRows().length / state.pageSize));
    if (state.page < totalPages) { state.page++; render(); }
  });
  q('btnTenantLastPage')?.addEventListener('click', () => {
    state.page = Math.max(1, Math.ceil(getDisplayRows().length / state.pageSize));
    render();
  });
  q('tenantPageSelect')?.addEventListener('change', (e) => {
    state.page = parseInt(e.target.value, 10) || 1;
    render();
  });
  q('tenantPageSize')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10) || 50;
    state.page = 1;
    render();
  });

  bindTableActions();

  const togglePw = q('btnTenantAdminTogglePw');
  if (togglePw && togglePw.dataset.bound !== '1') {
    togglePw.dataset.bound = '1';
    togglePw.addEventListener('click', () => {
      const input = q('tenantAdminPassword');
      const visible = input?.dataset.visible === '1';
      setPasswordFieldVisible(!visible);
    });
  }

  q('dlgTenantAdminAccount')?.addEventListener('close', () => {
    resetPasswordField('');
  });
}

function renderTableBody(rows) {
  const tbody = q('tenantCompanyBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align:center;padding:24px;">該当データがありません</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((t) => {
    const adminCell = t.adminUser
      ? `<button type="button" class="btn btn-secondary btn-sm btnViewTenantAdmin" data-id="${escapeHtml(t.id)}" title="${escapeHtml(t.adminUser.name)}">詳細</button>`
      : '<span class="text-muted">未作成</span>';

    return `
    <tr data-id="${escapeHtml(t.id)}">
      <td class="blue-link">${escapeHtml(t.id)}</td>
      <td>${escapeHtml(t.name)}</td>
      <td><code class="tenant-code">${escapeHtml(t.loginCode)}</code></td>
      <td class="col-center">
        <select class="input status-select ${t.isActive ? 'status-active' : 'status-inactive'}" data-id="${escapeHtml(t.id)}" style="text-align: center;">
          <option value="true" ${t.isActive ? 'selected' : ''}>有効</option>
          <option value="false" ${!t.isActive ? 'selected' : ''}>無効</option>
        </select>
      </td>
      <td class="text-muted">${escapeHtml(t.createdAt)}</td>
      <td class="col-center">${adminCell}</td>
    </tr>
  `;
  }).join('');
}

function renderPager(total) {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = Math.min(state.page * state.pageSize, total);

  if (q('tenantTotalCount')) q('tenantTotalCount').textContent = String(total);
  if (q('tenantRangeStart')) q('tenantRangeStart').textContent = String(start);
  if (q('tenantRangeEnd')) q('tenantRangeEnd').textContent = String(end);
  if (q('tenantPageTotal')) q('tenantPageTotal').textContent = `/ ${totalPages}`;

  const pageSelect = q('tenantPageSelect');
  if (pageSelect) {
    pageSelect.innerHTML = Array.from({ length: totalPages }, (_, i) => {
      const p = i + 1;
      return `<option value="${p}"${p === state.page ? ' selected' : ''}>${p}</option>`;
    }).join('');
  }

  renderPageNumberButtons(q('tenantPageNumbers'), state.page, totalPages, (p) => {
    state.page = p;
    render();
  });
}

function render() {
  const rows = getDisplayRows();
  const total = rows.length;
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);
  renderTableBody(pageRows);
  renderPager(total);
}

export function init() {
  bindUi();
  render();
}
