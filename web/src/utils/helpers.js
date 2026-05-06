export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function toNum(v) {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function includesPartial(haystack, needle) {
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
}

export function q(id) {
  return document.getElementById(id);
}
