import { mockCompanies } from '../../utils/mockData.js';

export function init() {
    renderCompanies(mockCompanies);

    const searchInput = document.getElementById('company-search');
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
        const advName = document.getElementById('adv-company-name').value.toLowerCase();
        const advPref = document.getElementById('adv-company-pref').value;
        const advIndustry = document.getElementById('adv-company-industry').value;
        const advBiz = document.getElementById('adv-company-biz').value;
        const advArea = document.getElementById('adv-company-area').value;
        const advTel = document.getElementById('adv-company-tel').value;
        const advAddr = document.getElementById('adv-company-addr').value.toLowerCase();

        const filtered = mockCompanies.filter(item => {
            const matchesBasic = item.name.toLowerCase().includes(term) || item.industry.toLowerCase().includes(term);
            const matchesAdvName = !advName || item.name.toLowerCase().includes(advName);
            const matchesAdvPref = !advPref || item.pref === advPref;
            const matchesAdvIndustry = !advIndustry || item.industry === advIndustry;
            const matchesAdvBiz = !advBiz || (item.biz || '') === advBiz;
            const matchesAdvArea = !advArea || (item.area || '') === advArea;
            const matchesAdvTel = !advTel || item.tel.includes(advTel);
            const matchesAdvAddr = !advAddr || item.addr.toLowerCase().includes(advAddr);
            
            return matchesBasic && matchesAdvName && matchesAdvPref && matchesAdvIndustry && 
                   matchesAdvBiz && matchesAdvArea && matchesAdvTel && matchesAdvAddr;
        });
        renderCompanies(filtered);
    }
}

function renderCompanies(data) {
    const container = document.getElementById('company-items-container');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="activity-item" onclick="window.location.hash='company-detail/${item.id}'">
            <div class="activity-item-header">
                <div class="activity-company">${item.name}</div>
            </div>
            <div class="activity-meta" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="meta-row">
                        <span class="meta-label">都道府県</span>
                        <span class="meta-value">${item.pref}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">郵便番号</span>
                        <span class="meta-value">${item.postal}</span>
                    </div>
                </div>
                <div class="meta-row">
                    <span class="meta-label">住所</span>
                    <span class="meta-value">${item.addr}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">代表TEL</span>
                    <span class="meta-value">${item.tel}</span>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
