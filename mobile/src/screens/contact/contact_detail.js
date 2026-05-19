import { mockContacts, mockCompanies } from '../../utils/mockData.js';

export function init(id) {
    const contact = mockContacts.find(c => c.id === id);
    if (!contact) return;

    // Populate contact fields
    const nameEl = document.getElementById('contact-name');
    if (nameEl) nameEl.textContent = `${contact.last} ${contact.first}`;
    
    const fields = {
        'contact-tel': contact.tel,
        'contact-tel2': contact.tel,
        'contact-fax': contact.fax,
        'contact-mobile': contact.mobile,
        'contact-email': contact.email,
        'contact-job-category': contact.jobCategory,
        'contact-position': contact.position,
        'contact-role': contact.role,
        'contact-free1': contact.free1,
        'contact-free2': contact.free2,
        'contact-free3': contact.free3,
        'contact-free4': contact.free4,
        'contact-free5': contact.free5
    };

    for (const [fieldId, value] of Object.entries(fields)) {
        const el = document.getElementById(fieldId);
        if (el) el.textContent = value || '-';
    }

    // Memo handling
    const memoKey = `memo_contact_${id}`;
    const memoEl = document.getElementById('contact-memo');
    if (memoEl) {
        memoEl.value = localStorage.getItem(memoKey) || contact.memo || '';
        memoEl.addEventListener('input', (e) => {
            localStorage.setItem(memoKey, e.target.value);
        });
    }

    // Populate company fields
    const company = mockCompanies.find(comp => comp.name === contact.company);
    if (company) {
        const companyFields = {
            'contact-company-name': company.name,
            'contact-company-postal': company.postal,
            'contact-company-pref': company.pref,
            'contact-company-addr': company.addr,
            'contact-company-tel': company.tel
        };

        for (const [fieldId, value] of Object.entries(companyFields)) {
            const el = document.getElementById(fieldId);
            if (el) el.textContent = value || '-';
        }
    }
}
