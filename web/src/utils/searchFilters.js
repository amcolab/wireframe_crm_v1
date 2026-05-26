/** Shared helpers for advanced-search filter indicator (.has-search-filters). */

export function readFormSearchConditions(form) {
  if (!form) return {};
  const result = {};
  let autoIdx = 0;

  const keyFor = (el) => {
    if (el.name) return el.name;
    if (el.id) return el.id;
    const dd = el.closest('.multi-select-dropdown');
    if (dd?.dataset?.name) return dd.dataset.name;
    return `_${autoIdx++}`;
  };

  form.querySelectorAll('input, select, textarea').forEach((el) => {
    const type = (el.type || '').toLowerCase();
    if (['submit', 'button', 'hidden', 'reset'].includes(type)) return;

    const key = keyFor(el);
    if (type === 'checkbox') {
      if (!Array.isArray(result[key])) result[key] = [];
      if (el.checked) result[key].push(el.value || 'on');
      return;
    }
    if (type === 'radio') {
      if (el.checked) result[key] = el.value;
      return;
    }
    if (el.tagName === 'SELECT') {
      const v = String(el.value ?? '').trim();
      if (v && v !== '-') result[key] = v;
      return;
    }
    const v = String(el.value ?? '').trim();
    if (v) result[key] = v;
  });

  return result;
}

export function hasSearchConditions(cond) {
  if (!cond || typeof cond !== 'object') return false;
  return Object.values(cond).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return String(v ?? '').trim() !== '';
  });
}

export function syncSearchFiltersIndicator(btn, cond) {
  if (!btn) return;
  btn.classList.toggle('has-search-filters', hasSearchConditions(cond));
}

export function resetFormMultiSelects(form) {
  if (!form) return;
  form.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });
  form.querySelectorAll('.multi-select-trigger').forEach((trigger) => {
    const dropdown = trigger.closest('.multi-select-dropdown');
    trigger.textContent = dropdown?.dataset?.placeholder || '選択..';
  });
}

export function bindAdvancedSearchForm({ btn, dlg, form, state, onApply }) {
  btn?.addEventListener('click', () => dlg?.showModal());

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const adv = readFormSearchConditions(form);
    state.advanced = hasSearchConditions(adv) ? adv : null;
    syncSearchFiltersIndicator(btn, state.advanced);
    onApply?.();
    dlg?.close();
  });

  form?.querySelector('.dlg-actions-left .btn.btn-secondary:not(.btn-search-history)')
    ?.addEventListener('click', () => {
      form.reset();
      resetFormMultiSelects(form);
    });
}

export function clearAdvancedSearch({ btn, form, state }) {
  state.advanced = null;
  form?.reset();
  resetFormMultiSelects(form);
  syncSearchFiltersIndicator(btn, null);
}
