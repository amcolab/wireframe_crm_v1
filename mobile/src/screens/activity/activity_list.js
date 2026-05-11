import { mockActivities } from '../../utils/mockData.js';

export function init() {
    renderActivities(mockActivities);
    
    const searchInput = document.getElementById('activity-search');
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
            
            return matchesBasic && matchesAdvCompany && matchesAdvType && matchesAdvSalesRep && matchesDateFrom && matchesDateTo;
        });
        renderActivities(filtered);
    }
}

function renderActivities(data) {
    const container = document.getElementById('activity-items-container');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="activity-item" onclick="window.location.hash='activity-detail/${item.id}'">
            <div class="activity-item-header" style="margin-bottom: 8px;">
                <div class="activity-company" style="font-size: 16px; color: var(--text-primary); font-weight: 700;">${item.company}</div>
                <div class="activity-date" style="font-size: 12px; color: var(--text-secondary);">${item.date}</div>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: var(--text-secondary);">
                <div>担当 <span style="color: var(--text-primary); margin-left: 4px;">${item.contact}</span></div>
                <div>営業 <span style="color: var(--text-primary); margin-left: 4px;">${item.salesRep}</span></div>
                <div>タイプ <span style="color: var(--text-primary); margin-left: 4px;">${item.type}</span></div>
            </div>
            <div class="activity-comment" style="font-size: 13px; color: var(--text-primary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${item.comment}
            </div>
        </div>
    `).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
