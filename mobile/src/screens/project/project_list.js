import { mockProjects } from '../../utils/mockData.js';
import { setupChipFilter, getActiveChipFilter } from '../../utils/chipFilter.js';
import { icon } from '../../utils/icons.js';
import { bindFilterIndicator } from '../../utils/filterIndicator.js';

const PROJECT_ADV_FIELDS = [
    'adv-project-company', 'adv-project-status', 'adv-project-salesrep',
    'adv-project-date-from', 'adv-project-date-to'
];

function formatShortDate(ymd) {
    // input: "YYYY/MM/DD" -> output: "YY/MM/DD"
    const s = String(ymd || '').trim();
    const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return s || '';
    return `${m[1].slice(-2)}/${m[2]}/${m[3]}`;
}

export function init() {
    renderProjects(mockProjects);
    setupChipFilter('project-filter-chips', () => applyFilters());
    bindFilterIndicator({ chipContainerId: 'project-filter-chips', fieldIds: PROJECT_ADV_FIELDS });
    const searchInput = document.getElementById('project-search');
    const filterBtn = document.querySelector('.filter-btn');
    const modal = document.getElementById('advanced-search-modal');
    const closeBtn = document.getElementById('close-advanced-search');
    const applyBtn = document.getElementById('apply-advanced-search');

    if (searchInput) searchInput.addEventListener('input', () => applyFilters());
    if (filterBtn && modal) filterBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
    if (closeBtn && modal) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (applyBtn && modal) applyBtn.addEventListener('click', () => { applyFilters(); modal.style.display = 'none'; });

    const prefill = localStorage.getItem('prefill_company_filter');
    if (prefill && searchInput) {
        searchInput.value = prefill;
        localStorage.removeItem('prefill_company_filter');
        applyFilters();
    }

    function applyFilters() {
        const term = (searchInput?.value || '').toLowerCase();
        const advCompany = document.getElementById('adv-project-company').value.toLowerCase();
        const advStatus = document.getElementById('adv-project-status').value;
        const advSalesRep = document.getElementById('adv-project-salesrep').value.toLowerCase();
        const advDateFrom = document.getElementById('adv-project-date-from').value.replace(/-/g, '/');
        const advDateTo = document.getElementById('adv-project-date-to').value.replace(/-/g, '/');

        const filtered = mockProjects.filter(item => {
            const matchesBasic = item.name.toLowerCase().includes(term) || item.company.toLowerCase().includes(term);
            const matchesAdvCompany = !advCompany || item.company.toLowerCase().includes(advCompany);
            const matchesAdvStatus = !advStatus || item.status === advStatus;
            const matchesAdvSalesRep = !advSalesRep || (item.salesRep || '').toLowerCase().includes(advSalesRep);
            const itemDate = item.topicDate || '';
            const matchesDateFrom = !advDateFrom || itemDate >= advDateFrom;
            const matchesDateTo = !advDateTo || itemDate <= advDateTo;
            const chipStatus = getActiveChipFilter('project-filter-chips');
            const matchesChip = !chipStatus || item.status === chipStatus;
            return matchesBasic && matchesAdvCompany && matchesAdvStatus && matchesAdvSalesRep
                && matchesDateFrom && matchesDateTo && matchesChip;
        });
        renderProjects(filtered);
    }
}

function renderProjects(data) {
    const container = document.getElementById('project-items-container');
    const countEl = document.getElementById('project-count');
    if (!container) return;
    if (countEl) countEl.textContent = data.length.toLocaleString('ja-JP');

    container.innerHTML = data.map(item => `
        <article class="act-card" onclick="window.location.hash='project-detail/${item.id}'">
            <div class="prj-grid">
                <div class="prj-company prj-l1">${item.company}</div>
                <div class="prj-r1"><span class="tag amber">${item.status}</span></div>

                <div class="prj-name prj-l2">${item.name}</div>
                <div class="prj-pair prj-r2">
                    <span class="k">営業</span>
                    <span class="v"><b>${item.salesRep || '-'}</b></span>
                </div>

                <div class="prj-pair prj-l3">
                    <span class="k">フォロー予定日</span>
                    <span class="v mono">${formatShortDate(item.followupDate) || '-'}</span>
                </div>
                <div class="prj-pair prj-r3">
                    <span class="k">話題日</span>
                    <span class="v mono"><b>${formatShortDate(item.topicDate) || '-'}</b></span>
                </div>
            </div>
        </article>
    `).join('');
}
