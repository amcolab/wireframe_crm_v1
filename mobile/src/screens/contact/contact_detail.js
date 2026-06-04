import { mockContacts, mockCompanies, mockActivities, mockProjects } from '../../utils/mockData.js';

function setPhoneLink(el, value) {
    if (!el) return;
    const v = value || '';
    if (v) {
        el.innerHTML = `<a class="link mono" href="tel:${v}">${v}</a>`;
        el.classList.add('link');
    } else {
        el.textContent = '-';
        el.classList.remove('link');
    }
}

export function init(id) {
    const contact = mockContacts.find(c => c.id === id);
    if (!contact) return;

    // Populate contact fields
    const nameEl = document.getElementById('contact-name');
    if (nameEl) nameEl.textContent = `${contact.last} ${contact.first}`;
    
    const fields = {
        'contact-fax': contact.fax,
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

    setPhoneLink(document.getElementById('contact-tel2'), contact.tel);
    setPhoneLink(document.getElementById('contact-mobile'), contact.mobile);

    const memoEl = document.getElementById('contact-memo');
    if (memoEl) {
        const saved = localStorage.getItem(`memo_contact_${id}`);
        memoEl.value = saved !== null ? saved : (contact.memo || '');
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

    renderCompanyRelatedLists(contact.company);
}

function renderCompanyRelatedLists(companyName) {
    const activitiesWrap = document.getElementById('contact-related-activities');
    const projectsWrap = document.getElementById('contact-related-projects');
    if (!activitiesWrap || !projectsWrap) return;

    const activitiesAllBtn = document.getElementById('contact-related-activities-all');
    const projectsAllBtn = document.getElementById('contact-related-projects-all');

    const relatedActivities = mockActivities
        .filter((a) => a.company === companyName)
        .slice()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const relatedProjects = mockProjects
        .filter((p) => p.company === companyName)
        .slice()
        .sort((a, b) => ((b.topicDate || b.followupDate || '')).localeCompare((a.topicDate || a.followupDate || '')));

    const renderList = (wrap, items, renderItem, emptyText) => {
        if (items.length === 0) {
            wrap.innerHTML = `<p class="empty-hint">${emptyText}</p>`;
            return;
        }
        wrap.innerHTML = items.slice(0, 5).map(renderItem).join('');
    };

    renderList(
        activitiesWrap,
        relatedActivities,
        (a) => `
            <div class="rel-item" role="button" tabindex="0" onclick="window.location.hash='activity-detail/${a.id}'">
                <div class="rel-main">
                    <div class="rel-title">${a.type || '—'} · ${a.contact || '—'}</div>
                    <div class="rel-sub">${a.purpose || a.motivation || '—'}</div>
                </div>
                <div class="rel-meta">${a.date || ''}</div>
            </div>
        `,
        '関連活動はありません'
    );

    renderList(
        projectsWrap,
        relatedProjects,
        (p) => `
            <div class="rel-item" role="button" tabindex="0" onclick="window.location.hash='project-detail/${p.id}'">
                <div class="rel-main">
                    <div class="rel-title">${p.name || '—'}</div>
                    <div class="rel-sub">${p.status || '—'} · ${p.salesRep || '—'}</div>
                </div>
                <div class="rel-meta">${p.topicDate || ''}</div>
            </div>
        `,
        '関連案件はありません'
    );

    const setupAllBtn = (btn, visible, onClick) => {
        if (!btn) return;
        btn.hidden = !visible;
        if (visible) btn.onclick = onClick;
    };

    setupAllBtn(activitiesAllBtn, relatedActivities.length > 5, () => {
        localStorage.setItem('prefill_company_filter', companyName);
        window.location.hash = 'activity';
    });

    setupAllBtn(projectsAllBtn, relatedProjects.length > 5, () => {
        localStorage.setItem('prefill_company_filter', companyName);
        window.location.hash = 'project';
    });
}
