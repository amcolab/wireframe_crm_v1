import { mockContacts } from '../../utils/mockData.js';
import { icon } from '../../utils/icons.js';
import { bindFilterIndicator } from '../../utils/filterIndicator.js';

const CONTACT_ADV_FIELDS = [
    'adv-contact-name', 'adv-contact-company', 'adv-contact-role',
    'adv-contact-mobile', 'adv-contact-email', 'adv-contact-longtime'
];

export function init() {
    renderContacts(mockContacts);
    bindFilterIndicator({ fieldIds: CONTACT_ADV_FIELDS });
    const searchInput = document.getElementById('contact-search');
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
        const advName = document.getElementById('adv-contact-name').value.toLowerCase();
        const advCompany = document.getElementById('adv-contact-company').value.toLowerCase();
        const advRole = document.getElementById('adv-contact-role').value.toLowerCase();
        const advMobile = document.getElementById('adv-contact-mobile').value.toLowerCase();
        const advEmail = document.getElementById('adv-contact-email').value.toLowerCase();

        const filtered = mockContacts.filter(item => {
            const full = (item.last + item.first).toLowerCase();
            const matchesBasic = full.includes(term) || item.company.toLowerCase().includes(term);
            const matchesAdvName = !advName || full.includes(advName);
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
    const countEl = document.getElementById('contact-count');
    if (!container) return;
    if (countEl) countEl.textContent = data.length.toLocaleString('ja-JP');

    container.innerHTML = data.map(item => `
        <article class="ct-card" onclick="window.location.hash='contact-detail/${item.id}'">
            <div class="co-card-head">
                <div>
                    <div class="ct-name">${item.last} ${item.first}</div>
                    <div class="ct-sub">${item.company}${item.dept ? ' · ' + item.dept : ''}</div>
                </div>
            </div>
            <dl class="ct-contact-grid">
                <dt>代表TEL</dt><dd>${item.tel || '-'}</dd>
                <dt>携帯</dt><dd>${item.mobile || '-'}</dd>
                <dt>Email</dt><dd>${item.email || '-'}</dd>
            </dl>
            <div class="co-card-foot">
                <span class="tag brand">${item.role || '—'}</span>
                <div class="quick-actions" onclick="event.stopPropagation()">
                    <button type="button" class="qa-btn accent" aria-label="詳細" onclick="window.location.hash='contact-detail/${item.id}'"><span class="icon">${icon('chevronRight')}</span></button>
                </div>
            </div>
        </article>
    `).join('');
}
