import { q, escapeHtml } from './helpers.js';
import { renderPageNumberButtons } from './pager.js';

export const TAB_EMPTY = {
  contactActivities: {
    title: '活動データはまだありません',
    desc: 'この担当者の活動を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
  },
  contactProjects: {
    title: '案件データはまだありません',
    desc: 'この担当者の案件を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3"/></svg>',
  },
  projectActivities: {
    title: '活動データはまだありません',
    desc: 'この案件の活動を登録すると、ここに表示されます。',
    icon: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
  },
};

export function renderTabEmptyState(container, pagerEl, config) {
  if (pagerEl) pagerEl.style.display = 'none';
  container.innerHTML = `
    <div class="empty-state">
      ${config.icon}
      <div class="title">${escapeHtml(config.title)}</div>
      <div class="desc">${escapeHtml(config.desc)}</div>
    </div>`;
}

export function showTabPager(pagerEl) {
  if (pagerEl) pagerEl.style.display = '';
}

function pagerBtnStem(key) {
  if (key.startsWith('contact')) return `Contact${key.slice('contact'.length)}`;
  if (key.startsWith('project')) return `Project${key.slice('project'.length)}`;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function updateTabPager(key, { total, page, pageSize }, onPageChange) {
  const btnStem = pagerBtnStem(key);
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

  renderPageNumberButtons(pageNumbersEl, page, totalPages, onPageChange);

  const first = q(`btn${btnStem}FirstPage`);
  const prev = q(`btn${btnStem}PrevPage`);
  const next = q(`btn${btnStem}NextPage`);
  const last = q(`btn${btnStem}LastPage`);
  if (first) first.disabled = page === 1;
  if (prev) prev.disabled = page === 1;
  if (next) next.disabled = page === totalPages;
  if (last) last.disabled = page === totalPages;
}

export function bindTabPager(key, state, pageKey, sizeKey, getItems, renderList) {
  const btnStem = pagerBtnStem(key);

  const go = () => {
    const items = getItems();
    const totalPages = Math.max(1, Math.ceil(items.length / state[sizeKey]));
    if (state[pageKey] > totalPages) state[pageKey] = totalPages;
    if (state[pageKey] < 1) state[pageKey] = 1;
    renderList();
  };

  q(`btn${btnStem}FirstPage`)?.addEventListener('click', () => { state[pageKey] = 1; go(); });
  q(`btn${btnStem}PrevPage`)?.addEventListener('click', () => {
    if (state[pageKey] > 1) { state[pageKey]--; go(); }
  });
  q(`btn${btnStem}NextPage`)?.addEventListener('click', () => {
    const items = getItems();
    const totalPages = Math.ceil(items.length / state[sizeKey]);
    if (state[pageKey] < totalPages) { state[pageKey]++; go(); }
  });
  q(`btn${btnStem}LastPage`)?.addEventListener('click', () => {
    const items = getItems();
    state[pageKey] = Math.max(1, Math.ceil(items.length / state[sizeKey]));
    go();
  });
  q(`${key}PageSelect`)?.addEventListener('change', (e) => {
    state[pageKey] = parseInt(e.target.value, 10) || 1;
    go();
  });
  q(`${key}PageSize`)?.addEventListener('change', (e) => {
    state[sizeKey] = parseInt(e.target.value, 10) || 10;
    state[pageKey] = 1;
    go();
  });
}

export function syncEntityDetailTabLayout(card, tab, detailTabName = 'detail') {
  if (!card) return;
  const isDetail = tab === detailTabName;
  card.classList.toggle('detail-tab-mode', isDetail);
  card.classList.toggle('table-tab-mode', !isDetail);
  const foot = card.querySelector('.form-foot-split');
  if (foot) foot.style.display = isDetail ? '' : 'none';
}
