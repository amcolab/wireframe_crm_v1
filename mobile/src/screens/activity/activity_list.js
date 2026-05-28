import { mockActivities } from '../../utils/mockData.js';
import { setupChipFilter, getActiveChipFilter } from '../../utils/chipFilter.js';
import { icon } from '../../utils/icons.js';
import { bindFilterIndicator } from '../../utils/filterIndicator.js';

const ACTIVITY_ADV_FIELDS = [
    'adv-activity-company', 'adv-activity-type', 'adv-activity-salesrep',
    'adv-activity-date-from', 'adv-activity-date-to'
];

function formatShortDate(ymd) {
    // input: "YYYY/MM/DD" -> output: "YY/MM/DD"
    const s = String(ymd || '').trim();
    const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return s || '';
    return `${m[1].slice(-2)}/${m[2]}/${m[3]}`;
}

export function init() {
    renderActivities(mockActivities);
    setupChipFilter('activity-filter-chips', () => applyFilters());
    bindFilterIndicator({ chipContainerId: 'activity-filter-chips', fieldIds: ACTIVITY_ADV_FIELDS });

    const searchInput = document.getElementById('activity-search');
    const filterBtn = document.querySelector('.filter-btn');
    const modal = document.getElementById('advanced-search-modal');
    const closeBtn = document.getElementById('close-advanced-search');
    const applyBtn = document.getElementById('apply-advanced-search');

    if (searchInput) searchInput.addEventListener('input', () => applyFilters());

    if (filterBtn && modal) {
        filterBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }
    if (applyBtn && modal) {
        applyBtn.addEventListener('click', () => {
            applyFilters();
            modal.style.display = 'none';
        });
    }

    const prefill = localStorage.getItem('prefill_company_filter');
    if (prefill && searchInput) {
        searchInput.value = prefill;
        localStorage.removeItem('prefill_company_filter');
        applyFilters();
    }

    function applyFilters() {
        const term = (searchInput?.value || '').toLowerCase();
        const advCompany = document.getElementById('adv-activity-company').value.toLowerCase();
        const advType = document.getElementById('adv-activity-type').value;
        const advSalesRep = document.getElementById('adv-activity-salesrep').value.toLowerCase();
        const advDateFrom = document.getElementById('adv-activity-date-from').value.replace(/-/g, '/');
        const advDateTo = document.getElementById('adv-activity-date-to').value.replace(/-/g, '/');

        const filtered = mockActivities.filter(item => {
            const matchesBasic = item.company.toLowerCase().includes(term) || item.contact.toLowerCase().includes(term);
            const matchesAdvCompany = !advCompany || item.company.toLowerCase().includes(advCompany);
            const matchesAdvType = !advType || item.type === advType;
            const matchesAdvSalesRep = !advSalesRep || item.salesRep.toLowerCase().includes(advSalesRep);
            const itemDate = item.date;
            const matchesDateFrom = !advDateFrom || itemDate >= advDateFrom;
            const matchesDateTo = !advDateTo || itemDate <= advDateTo;
            const chipType = getActiveChipFilter('activity-filter-chips');
            const matchesChip = !chipType || item.type === chipType;
            return matchesBasic && matchesAdvCompany && matchesAdvType && matchesAdvSalesRep
                && matchesDateFrom && matchesDateTo && matchesChip;
        });
        renderActivities(filtered);
    }
}

function renderActivities(data) {
    const container = document.getElementById('activity-items-container');
    const countEl = document.getElementById('activity-count');
    if (!container) return;

    if (countEl) countEl.textContent = data.length.toLocaleString('ja-JP');

    container.innerHTML = data.map(item => `
        <article class="act-card" onclick="window.location.hash='activity-detail/${item.id}'">
            <div class="act-top">
                <div class="act-title">${item.company}</div>
                <span class="tag brand">${item.type}</span>
            </div>
            <div class="act-mid">
                <div class="act-assignees">
                    <span>担当 <b>${item.contact}</b></span>
                    <span>営業 <b>${item.salesRep}</b></span>
                </div>
                <div class="act-date mono">${formatShortDate(item.date)}</div>
            </div>
            <p class="act-snippet">${item.comment}</p>
        </article>
    `).join('');
}
