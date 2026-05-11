import { mockContacts } from '../../utils/mockData.js';

export function init() {
    renderContacts(mockContacts);
    
    const searchInput = document.getElementById('contact-search');
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
        const advName = document.getElementById('adv-contact-name').value.toLowerCase();
        const advCompany = document.getElementById('adv-contact-company').value.toLowerCase();
        const advRole = document.getElementById('adv-contact-role').value.toLowerCase();
        const advMobile = document.getElementById('adv-contact-mobile').value.toLowerCase();
        const advEmail = document.getElementById('adv-contact-email').value.toLowerCase();

        const filtered = mockContacts.filter(item => {
            const matchesBasic = (item.last + item.first).toLowerCase().includes(term) || item.company.toLowerCase().includes(term);
            const matchesAdvName = !advName || (item.last + item.first).toLowerCase().includes(advName);
            const matchesAdvCompany = !advCompany || item.company.toLowerCase().includes(advCompany);
            const matchesAdvRole = !advRole || (item.role || '').toLowerCase().includes(advRole);
            const matchesAdvMobile = !advMobile || (item.mobile || '').toLowerCase().includes(advMobile);
            const matchesAdvEmail = !advEmail || (item.email || '').toLowerCase().includes(advEmail);
            
            return matchesBasic && matchesAdvName && matchesAdvCompany && matchesAdvRole && matchesAdvMobile && matchesAdvEmail;
        });
        renderContacts(filtered);
    }
}

function renderContacts(data) {
    const container = document.getElementById('contact-items-container');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="activity-item" onclick="window.location.hash='contact-detail/${item.id}'">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="compact-contact-info">
                    <h4 style="font-size: 16px; margin-bottom: 6px; color: var(--text-primary);">${item.last} ${item.first}</h4>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">${item.company}</p>
                    <p style="font-size: 13px; color: var(--text-secondary);">${item.dept || ''}</p>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; font-size: 11px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">代表TEL</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${item.tel || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; font-size: 11px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">携帯電話</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${item.mobile || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: flex-end; font-size: 11px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">Email</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${item.email || '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
