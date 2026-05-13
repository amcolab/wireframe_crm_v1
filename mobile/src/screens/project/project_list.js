import { mockProjects } from '../../utils/mockData.js';

export function init() {
    renderProjects(mockProjects);

    const searchInput = document.getElementById('project-search');
    const filterBtn = document.querySelector('.filter-btn');
    const modal = document.getElementById('advanced-search-modal');
    const closeBtn = document.getElementById('close-advanced-search');
    const applyBtn = document.getElementById('apply-advanced-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            applyFilters();
        });
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

            return matchesBasic && matchesAdvCompany && matchesAdvStatus && matchesAdvSalesRep && matchesDateFrom && matchesDateTo;
        });
        renderProjects(filtered);
    }
}

function renderProjects(data) {
    const container = document.getElementById('project-items-container');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="activity-item" onclick="window.location.hash='project-detail/${item.id}'">
            <div class="activity-item-header" style="margin-bottom: 8px;">
                <div class="activity-company" style="font-size: 16px; color: var(--text-primary); font-weight: 700;">${item.company}</div>
                <div class="activity-date" style="font-size: 12px;">${item.status}</div>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 4px; font-size: 12px; color: var(--text-secondary);">
                <div>話題日 <span style="color: var(--text-primary); margin-left: 4px;">${item.topicDate || '-'}</span></div>
                <div>フォロー予定日 <span style="color: var(--text-primary); margin-left: 4px;">${item.followupDate || '-'}</span></div>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: var(--text-secondary);">
                <div>営業 <span style="color: var(--text-primary); margin-left: 4px;">${item.salesRep || '-'}</span></div>
                <div>案件名 <span style="color: var(--text-primary); margin-left: 4px;">${item.name}</span></div>
            </div>
            <div class="activity-comment" style="font-size: 13px; color: var(--text-primary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                概要 <span style="margin-left: 4px;">${item.summary || '-'}</span>
            </div>
        </div>
    `).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
