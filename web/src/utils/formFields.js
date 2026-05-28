import { q } from './helpers.js';

/**
 * Set input/textarea/select value (select: add option if missing).
 * @param {string} id
 * @param {unknown} val
 */
export function setFormField(id, val) {
  const el = q(id);
  if (!el) return;

  if (el.type === 'checkbox') {
    el.checked = !!val;
    return;
  }

  if (el.tagName === 'SELECT') {
    setSelectField(el, val);
    return;
  }

  el.value = val ?? '';
}

/**
 * @param {HTMLSelectElement} select
 * @param {unknown} val
 */
function setSelectField(select, val) {
  const v = String(val ?? '').trim();
  if (!v) {
    const placeholder = Array.from(select.options).find(
      (o) => !o.value || o.value === '-' || o.textContent.trim() === '-'
    );
    if (placeholder) {
      while (select.options.length > 1) {
        select.remove(select.options.length - 1);
      }
      select.value = placeholder.value;
    } else {
      select.value = '';
    }
    return;
  }

  let opt = Array.from(select.options).find(
    (o) => o.value === v || o.textContent.trim() === v
  );
  if (!opt) {
    opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  }
  select.value = opt.value;
}
