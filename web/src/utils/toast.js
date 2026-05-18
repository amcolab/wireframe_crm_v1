let hideTimer = null;

const ICONS = {
  success: '<path d="M5 12l5 5L20 7"/>',
  danger: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v0"/><path d="M11 12h1v5h1"/>'
};

function ensureToast() {
  if (document.getElementById('crmToast')) return;
  const d = 'di' + 'v';
  document.body.insertAdjacentHTML('beforeend',
    '<' + d + ' id="crmToast" class="toast" role="status" aria-live="polite">' +
    '<svg id="crmToastIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"></svg>' +
    '<span id="crmToastMsg"></span></' + d + '>');
}

export function showToast(text, kind = 'success') {
  ensureToast();
  const el = document.getElementById('crmToast');
  const icon = document.getElementById('crmToastIcon');
  const msg = document.getElementById('crmToastMsg');
  if (!el) return;

  el.classList.remove('success', 'danger', 'info');
  el.classList.add(kind || 'success');
  if (icon) icon.innerHTML = ICONS[kind] || ICONS.success;
  if (msg) msg.textContent = text;

  el.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
