import { mockCompanies } from '../../utils/mockData.js';
import { setupChipFilter, getActiveChipFilter } from '../../utils/chipFilter.js';
import { icon } from '../../utils/icons.js';
import { bindFilterIndicator } from '../../utils/filterIndicator.js';

const COMPANY_ADV_FIELDS = [
    'adv-company-name', 'adv-company-pref', 'adv-company-industry',
    'adv-company-biz', 'adv-company-area', 'adv-company-addr'
];

export function init() {
    renderCompanies(mockCompanies);
    setupChipFilter('company-filter-chips', () => applyFilters());
    bindFilterIndicator({ chipContainerId: 'company-filter-chips', fieldIds: COMPANY_ADV_FIELDS });

    const searchInput = document.getElementById('company-search');
    const filterBtn = document.querySelector('.filter-btn');
    const modal = document.getElementById('advanced-search-modal');
    const closeBtn = document.getElementById('close-advanced-search');
    const applyBtn = document.getElementById('apply-advanced-search');

    if (searchInput) {
        searchInput.addEventListener('input', () => applyFilters());
    }

    if (filterBtn && modal) {
        filterBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (applyBtn && modal) {
        applyBtn.addEventListener('click', () => {
            applyFilters();
            modal.style.display = 'none';
        });
    }

    function applyFilters() {
        const term = (searchInput?.value || '').toLowerCase();
        const advName = document.getElementById('adv-company-name').value.toLowerCase();
        const advPref = document.getElementById('adv-company-pref').value;
        const advIndustry = document.getElementById('adv-company-industry').value;
        const advBiz = document.getElementById('adv-company-biz').value;
        const advArea = document.getElementById('adv-company-area').value;
        const advTelEl = document.getElementById('adv-company-tel');
        const advTel = advTelEl ? advTelEl.value : '';
        const advAddr = document.getElementById('adv-company-addr').value.toLowerCase();

        const filtered = mockCompanies.filter(item => {
            const matchesBasic = item.name.toLowerCase().includes(term)
                || (item.industry || '').toLowerCase().includes(term)
                || item.tel.includes(term)
                || item.addr.toLowerCase().includes(term);
            const matchesAdvName = !advName || item.name.toLowerCase().includes(advName);
            const matchesAdvPref = !advPref || item.pref === advPref;
            const matchesAdvIndustry = !advIndustry || item.industry === advIndustry;
            const matchesAdvBiz = !advBiz || (item.biz || '') === advBiz;
            const matchesAdvArea = !advArea || (item.area || '') === advArea;
            const matchesAdvTel = !advTel || item.tel.includes(advTel);
            const matchesAdvAddr = !advAddr || item.addr.toLowerCase().includes(advAddr);
            const chipIndustry = getActiveChipFilter('company-filter-chips');
            const matchesChip = !chipIndustry || item.industry === chipIndustry;

            return matchesBasic && matchesAdvName && matchesAdvPref && matchesAdvIndustry
                && matchesAdvBiz && matchesAdvArea && matchesAdvTel && matchesAdvAddr && matchesChip;
        });
        renderCompanies(filtered);
    }
}

function renderCompanies(data) {
    const container = document.getElementById('company-items-container');
    const countEl = document.getElementById('company-count');
    if (!container) return;

    if (countEl) countEl.textContent = data.length.toLocaleString('ja-JP');

    container.innerHTML = data.map(item => `
        <article class="co-card" onclick="window.location.hash='company-detail/${item.id}'">
            <div class="co-card-head">
                <div>
                    <div class="co-name">${item.name}</div>
                    <div class="co-id">${item.id} · ${item.industry || '—'}</div>
                </div>
            </div>
            <dl class="co-grid">
                <dt>都道府県</dt><dd>${item.pref}</dd>
                <dt>郵便番号</dt><dd>${item.postal}</dd>
                <dt>住所</dt><dd>${item.addr}</dd>
                <dt>代表TEL</dt><dd class="tel">${item.tel}</dd>
            </dl>
            <div class="co-card-foot">
                <span class="tag brand">${item.industryGroup || item.industry || '—'}</span>
                <div class="quick-actions" onclick="event.stopPropagation()">
                    <a href="tel:${item.tel}" class="qa-btn" aria-label="電話"><span class="icon">${icon('phone')}</span></a>
                    <button type="button" class="qa-btn accent" aria-label="詳細" onclick="window.location.hash='company-detail/${item.id}'"><span class="icon">${icon('chevronRight')}</span></button>
                </div>
            </div>
        </article>
    `).join('');
}
