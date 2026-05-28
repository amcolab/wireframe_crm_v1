import { menuOptions, subMenuOptions } from './setting-columns.js';
import { q, escapeHtml } from './helpers.js';
import { showToast } from './toast.js';
import * as XLSX from 'xlsx';

const STORAGE_PREFIX = 'smos.columnSettings';

/** Số cột mặc định hiển thị (会社メニュー → 会社一覧) — khớp wireframe gốc */
const DEFAULT_VISIBLE_COUNT = { '1-1': 11 };

function storageKey(menuVal, subVal) {
  return `${STORAGE_PREFIX}.${menuVal}.${subVal}`;
}

function getSubMenus(menuVal) {
  return subMenuOptions[menuVal] ?? [];
}

function getSubEntry(menuVal, subVal) {
  return getSubMenus(menuVal).find((s) => s.value === subVal);
}

function defaultSettings(columns, menuVal, subVal) {
  const n = DEFAULT_VISIBLE_COUNT[`${menuVal}-${subVal}`] ?? columns.length;
  return columns.map((col, i) => ({
    value: col.value,
    label: col.label,
    visible: i < n,
  }));
}

export function loadColumnSettings(menuVal, subVal) {
  const sub = getSubEntry(menuVal, subVal);
  if (!sub?.columns) return [];

  const key = storageKey(menuVal, subVal);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) throw new Error('invalid');

      const labelByValue = new Map(sub.columns.map((c) => [c.value, c.label]));
      const seen = new Set();
      const merged = saved
        .filter((s) => labelByValue.has(s.value))
        .map((s) => {
          seen.add(s.value);
          return {
            value: s.value,
            label: labelByValue.get(s.value),
            visible: Boolean(s.visible),
          };
        });

      sub.columns.forEach((col) => {
        if (!seen.has(col.value)) {
          merged.push({ value: col.value, label: col.label, visible: false });
        }
      });
      return merged;
    }
  } catch {
    /* fall through */
  }
  return defaultSettings(sub.columns, menuVal, subVal);
}

export function saveColumnSettings(menuVal, subVal, items) {
  const payload = items.map(({ value, visible }) => ({ value, visible }));
  localStorage.setItem(storageKey(menuVal, subVal), JSON.stringify(payload));
}

let state = {
  menuVal: menuOptions[0]?.value ?? 1,
  subVal: 1,
  items: [],
  selectedIdx: -1,
};

function fillSelect(select, options, selectedValue) {
  if (!select) return;
  select.innerHTML = options
    .map(
      (o) =>
        `<option value="${o.value}"${Number(o.value) === Number(selectedValue) ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
    )
    .join('');
}

function syncSubMenuSelect() {
  const subSel = q('colSubMenuSelect');
  const subs = getSubMenus(state.menuVal);
  if (!subs.length) {
    subSel.innerHTML = '';
    state.subVal = 0;
    return;
  }
  if (!subs.some((s) => s.value === state.subVal)) {
    state.subVal = subs[0].value;
  }
  fillSelect(subSel, subs, state.subVal);
}

function updateSummary() {
  const el = q('colSettingsSummary');
  if (!el) return;
  const total = state.items.length;
  const visible = state.items.filter((c) => c.visible).length;
  el.textContent = total ? `${visible} / ${total} 列を表示` : '';
  const allToggle = q('chkColAllVisible');
  if (allToggle) {
    allToggle.checked = total > 0 && visible === total;
    allToggle.indeterminate = visible > 0 && visible < total;
  }
}

function renderColumnTable() {
  const tbody = q('colSettingsBody');
  if (!tbody) return;

  tbody.innerHTML = state.items
    .map((item, idx) => {
      const selected = idx === state.selectedIdx ? ' selected' : '';
      const hidden = !item.visible ? ' col-settings-row--hidden' : '';
      return `
      <tr data-idx="${idx}" draggable="true" class="col-settings-row${selected}${hidden}" tabindex="0">
        <td class="col-no"><span class="col-row-handle" title="ドラッグして並べ替え">⋮⋮</span>${idx + 1}</td>
        <td class="col-title">${escapeHtml(item.label)}</td>
        <td class="col-center">
          <label class="col-vis-toggle" title="${item.visible ? '非表示にする' : '表示する'}">
            <input type="checkbox" class="col-vis-input" data-idx="${idx}" ${item.visible ? 'checked' : ''} />
            <span class="col-vis-toggle__track" aria-hidden="true"></span>
          </label>
        </td>
      </tr>`;
    })
    .join('');

  let dragFromIdx = -1;
  tbody.querySelectorAll('.col-settings-row').forEach((tr) => {
    const idx = Number(tr.dataset.idx);
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.col-vis-toggle')) return;
      state.selectedIdx = idx;
      renderColumnTable();
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        state.selectedIdx = idx;
        renderColumnTable();
      }
    });
    tr.addEventListener('dragstart', (e) => {
      dragFromIdx = idx;
      tr.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tr.addEventListener('dragend', () => {
      dragFromIdx = -1;
      tr.classList.remove('is-dragging');
      tbody.querySelectorAll('.col-settings-row').forEach((r) => r.classList.remove('is-drop-target'));
    });
    tr.addEventListener('dragover', (e) => {
      if (dragFromIdx < 0) return;
      e.preventDefault();
      const rect = tr.getBoundingClientRect();
      const placeAfter = e.clientY > rect.top + rect.height / 2;
      tr.classList.add('is-drop-target');
      tr.classList.toggle('is-drop-after', placeAfter);
      tr.classList.toggle('is-drop-before', !placeAfter);
    });
    tr.addEventListener('dragleave', () => {
      tr.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
    });
    tr.addEventListener('drop', (e) => {
      if (dragFromIdx < 0) return;
      e.preventDefault();
      const dragToIdx = Number(tr.dataset.idx);
      const placeAfter = tr.classList.contains('is-drop-after');
      tr.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
      if (dragFromIdx === dragToIdx) return;
      const next = [...state.items];
      const [moved] = next.splice(dragFromIdx, 1);
      const targetIdx = placeAfter ? dragToIdx + 1 : dragToIdx;
      const insertIdx = dragFromIdx < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(insertIdx, 0, moved);
      state.items = next;
      state.selectedIdx = insertIdx;
      renderColumnTable();
    });
  });

  tbody.querySelectorAll('.col-vis-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      e.stopPropagation();
      const i = Number(input.dataset.idx);
      if (state.items[i]) {
        state.items[i].visible = input.checked;
        updateSummary();
        const tr = input.closest('tr');
        tr?.classList.toggle('col-settings-row--hidden', !input.checked);
      }
    });
  });

  updateSummary();
  updateMoveButtons();
}

function updateMoveButtons() {
  const up = q('btnColMoveUp');
  const down = q('btnColMoveDown');
  const len = state.items.length;
  const i = state.selectedIdx;
  if (up) up.disabled = i <= 0 || len < 2;
  if (down) down.disabled = i < 0 || i >= len - 1 || len < 2;
}

function reloadItems() {
  state.items = loadColumnSettings(state.menuVal, state.subVal);
  if (state.selectedIdx >= state.items.length) {
    state.selectedIdx = state.items.length ? 0 : -1;
  }
  renderColumnTable();
}

function moveSelected(delta) {
  const i = state.selectedIdx;
  const j = i + delta;
  if (i < 0 || j < 0 || j >= state.items.length) return;
  const next = [...state.items];
  [next[i], next[j]] = [next[j], next[i]];
  state.items = next;
  state.selectedIdx = j;
  renderColumnTable();
}

function setAllVisible(visible) {
  state.items = state.items.map((item) => ({ ...item, visible }));
  renderColumnTable();
}

function resetToDefaults() {
  const sub = getSubEntry(state.menuVal, state.subVal);
  if (!sub) return;
  state.items = defaultSettings(sub.columns, state.menuVal, state.subVal);
  state.selectedIdx = state.items.length ? 0 : -1;
  renderColumnTable();
}

function currentContextLabel() {
  const menu = menuOptions.find((m) => Number(m.value) === Number(state.menuVal));
  const sub = getSubEntry(state.menuVal, state.subVal);
  return {
    menuLabel: menu?.label || `menu-${state.menuVal}`,
    subLabel: sub?.label || `sub-${state.subVal}`,
  };
}

function updateSelectedFileName(name = '') {
  const el = q('colSettingsFileName');
  if (!el) return;
  el.textContent = name || 'ファイル未選択';
}

function exportCurrentSettings() {
  const { menuLabel, subLabel } = currentContextLabel();
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  const rows = state.items.map((item, idx) => ({
    order: idx + 1,
    value: item.value,
    label: item.label,
    visible: item.visible ? 'ON' : 'OFF',
  }));

  const metaRows = [
    { key: 'version', value: 1 },
    { key: 'exportedAt', value: new Date().toISOString() },
    { key: 'menuValue', value: state.menuVal },
    { key: 'menuLabel', value: menuLabel },
    { key: 'subMenuValue', value: state.subVal },
    { key: 'subMenuLabel', value: subLabel },
  ];

  const wb = XLSX.utils.book_new();
  const wsSettings = XLSX.utils.json_to_sheet(rows);
  const wsMeta = XLSX.utils.json_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(wb, wsSettings, 'settings');
  XLSX.utils.book_append_sheet(wb, wsMeta, 'meta');
  XLSX.writeFile(wb, `column-settings_${state.menuVal}-${state.subVal}_${stamp}.xlsx`);
  showToast('Excelへエクスポートしました');
}

function applyImportedSettingsObject(parsed) {
  const incomingItems = Array.isArray(parsed) ? parsed : [];
  if (!incomingItems.length) {
    throw new Error('empty');
  }

  const byLabel = new Map(incomingItems.map((x) => [String(x.label || ''), x]));
  const byValue = new Map(incomingItems.map((x) => [Number(x.value), x]));

  const nextItems = state.items.map((base) => {
    const hit = byValue.get(Number(base.value)) || byLabel.get(base.label);
    return {
      ...base,
      visible: hit ? Boolean(hit.visible) : false,
    };
  });

  const ordered = [];
  incomingItems.forEach((raw) => {
    const found = nextItems.find((item) =>
      Number(item.value) === Number(raw.value) || item.label === String(raw.label || ''),
    );
    if (found && !ordered.includes(found)) ordered.push(found);
  });
  nextItems.forEach((item) => {
    if (!ordered.includes(item)) ordered.push(item);
  });

  state.items = ordered;
  state.selectedIdx = state.items.length ? Math.min(state.selectedIdx, state.items.length - 1) : -1;
  renderColumnTable();
}

function importFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: 'array' });
      const sheetName = wb.SheetNames.find((name) => name.toLowerCase() === 'settings') || wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
      const normalized = rows.map((r) => ({
        value: Number(r.value),
        label: String(r.label ?? ''),
        visible: String(r.visible ?? '').toUpperCase() === 'ON' || String(r.visible ?? '').toLowerCase() === 'true' || String(r.visible ?? '') === '1',
      }));
      applyImportedSettingsObject(normalized);
      updateSelectedFileName(file.name);
      showToast('Excel設定を読み込みました');
    } catch {
      showToast('Excelファイルの形式が不正です', 'danger');
    }
  };
  reader.onerror = () => {
    showToast('ファイルの読み込みに失敗しました', 'danger');
  };
  reader.readAsArrayBuffer(file);
}

export function refreshColumnSettingsView() {
  syncSubMenuSelect();
  reloadItems();
}

export function openColumnSettingsDialog() {
  initColumnSettings();
  const menuSel = q('colMenuSelect');
  if (menuSel) state.menuVal = Number(menuSel.value) || state.menuVal;
  const subSel = q('colSubMenuSelect');
  if (subSel) state.subVal = Number(subSel.value) || state.subVal;
  state.selectedIdx = 0;
  refreshColumnSettingsView();
  q('dlgColumnSettings')?.showModal();
}

export function initColumnSettings() {
  const dlg = q('dlgColumnSettings');
  if (!dlg || dlg.dataset.colSettingsBound) return;
  dlg.dataset.colSettingsBound = '1';

  const menuSel = q('colMenuSelect');
  const subSel = q('colSubMenuSelect');

  fillSelect(menuSel, menuOptions, state.menuVal);
  state.menuVal = Number(menuSel?.value) || state.menuVal;
  syncSubMenuSelect();
  reloadItems();

  menuSel?.addEventListener('change', () => {
    state.menuVal = Number(menuSel.value);
    syncSubMenuSelect();
    state.selectedIdx = 0;
    reloadItems();
  });

  subSel?.addEventListener('change', () => {
    state.subVal = Number(subSel.value);
    state.selectedIdx = 0;
    reloadItems();
  });

  q('btnColShowAll')?.addEventListener('click', () => setAllVisible(true));
  q('btnColHideAll')?.addEventListener('click', () => setAllVisible(false));
  q('btnColResetDefaults')?.addEventListener('click', resetToDefaults);
  q('chkColAllVisible')?.addEventListener('change', (e) => {
    setAllVisible(Boolean(e.target.checked));
  });

  q('btnColMoveUp')?.addEventListener('click', () => moveSelected(-1));
  q('btnColMoveDown')?.addEventListener('click', () => moveSelected(1));
  q('btnColExportSettings')?.addEventListener('click', exportCurrentSettings);
  q('btnColImportSettings')?.addEventListener('click', () => {
    const input = q('colSettingsFileInput');
    if (!input?.files?.[0]) {
      showToast('先にExcelファイルを選択してください', 'info');
      return;
    }
    importFromFile(input.files[0]);
  });

  const fileInput = q('colSettingsFileInput');
  const dropzone = q('colSettingsDropzone');
  const browse = q('btnColFileBrowse');

  browse?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput?.click();
    }
  });
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    updateSelectedFileName(file?.name || '');
  });
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-dragover');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (fileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    }
    updateSelectedFileName(file.name);
    importFromFile(file);
  });

  q('btnSaveColumnSettings')?.addEventListener('click', () => {
    saveColumnSettings(state.menuVal, state.subVal, state.items);
    window.dispatchEvent(
      new CustomEvent('smos:column-settings-updated', {
        detail: { menuVal: state.menuVal, subVal: state.subVal },
      }),
    );
    showToast('列の設定を保存しました');
    dlg.close();
  });

  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.selectedIdx > 0) {
        state.selectedIdx -= 1;
        renderColumnTable();
        scrollSelectedIntoView();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.selectedIdx < state.items.length - 1) {
        state.selectedIdx += 1;
        renderColumnTable();
        scrollSelectedIntoView();
      }
    }
  });
}

function scrollSelectedIntoView() {
  const row = q('colSettingsBody')?.querySelector('tr.selected');
  row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
