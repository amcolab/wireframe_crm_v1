import { mockCompanies, mockContacts } from '../../utils/mockData.js';

export function init(id) {
    const company = mockCompanies.find(c => c.id === id);
    if (company) {
        fillDetail(company);
        setupMemo(company);
        renderContacts(company.name);
    }
}

function fillDetail(company) {
    const fields = {
        'company-name': company.name,
        'company-postal': company.postal,
        'company-pref': company.pref,
        'company-addr': company.addr,
        'company-tel': company.tel,
        'company-fax': company.fax,
        'company-district': company.district,
        'company-industryGroup': company.industryGroup,
        'company-industry': company.industry,
        'company-scale': company.scale,
        'company-type': company.type,
        'company-corpNumber': company.corpNumber,
        'company-employees': company.employees,
        'company-capital': company.capital,
        'company-free1': company.free1,
        'company-free2': company.free2,
        'company-free3': company.free3,
        'company-free4': company.free4,
        'company-free5': company.free5
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    }
}

function setupMemo(company) {
    const memoEl = document.getElementById('company-memo');
    if (!memoEl) return;

    // Load from localStorage if exists, otherwise from mockData
    const savedMemo = localStorage.getItem(`memo_company_${company.id}`);
    memoEl.value = savedMemo !== null ? savedMemo : (company.memo || '');

    memoEl.addEventListener('input', (e) => {
        localStorage.setItem(`memo_company_${company.id}`, e.target.value);
    });
}

function renderContacts(companyName) {
    const container = document.getElementById('company-contacts-list');
    if (!container) return;

    // Filter contacts by company name
    const contacts = mockContacts.filter(c => c.company === companyName);
    
    if (contacts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">登録されている担当者はいません</p>';
        return;
    }

    container.innerHTML = contacts.map(c => `
        <div class="compact-contact-item" style="display: block; padding: 16px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="compact-contact-info">
                    <h4 style="font-size: 16px; margin-bottom: 6px; color: var(--text-primary);">${c.last} ${c.first}</h4>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">${c.company}</p>
                    <p style="font-size: 13px; color: var(--text-secondary);">${c.dept || ''}</p>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 6px; font-size: 12px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">代表TEL</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${c.tel || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 6px; font-size: 12px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">携帯電話</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${c.mobile || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: flex-end; font-size: 12px;">
                        <span style="color: var(--text-secondary); width: 80px; text-align: left;">Email</span>
                        <span style="color: var(--text-primary); font-weight: 500; flex: 1; text-align: right;">${c.email || '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
