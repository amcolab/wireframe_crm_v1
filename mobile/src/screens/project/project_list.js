import { mockProjects } from '../../utils/mockData.js';
import { setupChipFilter, getActiveChipFilter } from '../../utils/chipFilter.js';
import { icon } from '../../utils/icons.js';
import { bindFilterIndicator } from '../../utils/filterIndicator.js';

const PROJECT_ADV_FIELDS = [
    'adv-project-company', 'adv-project-status', 'adv-project-salesrep',
    'adv-project-date-from', 'adv-project-date-to'
];

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
            <div class="co-card-head">
                <div>
                    <div class="act-title">${item.name}</div>
                    <div class="act-meta-line">${item.company}</div>
                </div>
                <span class="tag amber">${item.status}</span>
            </div>
            <div class="act-row">
                <span>話題日 <b>${item.topicDate || '-'}</b></span>
                <span>営業 <b>${item.salesRep || '-'}</b></span>
            </div>
            <p class="act-snippet">${item.summary || '—'}</p>
            <div class="co-card-foot">
                <span class="last-act">フォロー ${item.followupDate || '—'}</span>
                <div class="quick-actions" onclick="event.stopPropagation()">
                    <button type="button" class="qa-btn accent" aria-label="詳細" onclick="window.location.hash='project-detail/${item.id}'"><span class="icon">${icon('chevronRight')}</span></button>
                </div>
            </div>
        </article>
    `).join('');
}
