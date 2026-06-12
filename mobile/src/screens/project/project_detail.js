import { mockProjects, mockActivities, mockCompanies, mockContacts } from '../../utils/mockData.js';

function formatShortDate(ymd) {
    // input: "YYYY/MM/DD" -> output: "YY/MM/DD"
    const s = String(ymd || '').trim();
    const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return s || '';
    return `${m[1].slice(-2)}/${m[2]}/${m[3]}`;
}

export function init(id) {
    console.log('Project Detail initialized for ID:', id);
    const project = mockProjects.find(p => p.id === id);
    if (!project) return;

    // Populate project fields
    const companyEl = document.getElementById('project-company');
    if (companyEl) {
        const company = mockCompanies.find((c) => c.name === project.company);
        if (company?.id) {
            companyEl.innerHTML = `<a class="link" href="#company-detail/${company.id}">${project.company}</a>`;
            companyEl.classList.add('link');
        } else {
            companyEl.textContent = project.company || '-';
            companyEl.classList.remove('link');
        }
    }
    document.getElementById('project-topic-date').textContent = project.topicDate || '-';
    document.getElementById('project-followup-date').textContent = project.followupDate || '-';
    document.getElementById('project-status').textContent = project.status || '-';
    document.getElementById('project-motivation').textContent = project.motivation || '-';
    document.getElementById('project-salesrep').textContent = project.salesRep || '-';
    document.getElementById('project-name').textContent = project.name || '-';
    document.getElementById('project-initial-accuracy').textContent = project.initialAccuracy || '-';
    document.getElementById('project-revised-accuracy').textContent = project.revisedAccuracy || '-';
    const contactEl = document.getElementById('project-contact-name');
    if (contactEl) {
        const name = (project.contactName || '').trim();
        let contact = project.contactId
            ? mockContacts.find((c) => c.id === project.contactId)
            : null;
        if (!contact && name) {
            contact = mockContacts.find(
                (c) => c.company === project.company && `${c.last} ${c.first}` === name
            );
            if (!contact) {
                const parts = name.split(/\s+/);
                const last = parts[0] || '';
                const first = parts.slice(1).join(' ') || '';
                contact = mockContacts.find(
                    (c) => c.company === project.company && c.last === last && c.first === first
                );
            }
        }
        if (contact?.id) {
            const label = name || `${contact.last} ${contact.first}`;
            contactEl.innerHTML = `<a class="link" href="#contact-detail/${contact.id}">${label}</a>`;
            contactEl.classList.add('link');
        } else {
            contactEl.textContent = name || '-';
            contactEl.classList.remove('link');
        }
    }
    document.getElementById('project-competitor').textContent = project.competitor || '-';
    document.getElementById('project-sale-date').textContent = project.saleDate || '-';
    document.getElementById('project-lost-date').textContent = project.lostDate || '-';
    document.getElementById('project-inquiry-method').textContent = project.inquiryMethod || '-';
    
    document.getElementById('project-free1').textContent = project.free1 || '-';
    document.getElementById('project-free2').textContent = project.free2 || '-';
    document.getElementById('project-free3').textContent = project.free3 || '-';
    document.getElementById('project-free4').textContent = project.free4 || '-';
    document.getElementById('project-free5').textContent = project.free5 || '-';

    const summaryEl = document.getElementById('project-summary');
    if (summaryEl) {
        summaryEl.value = project.summary || '';
    }

    // Related Activities
    const activitiesContainer = document.getElementById('project-activities-container');
    if (activitiesContainer) {
        const relatedActivities = mockActivities
            .filter(a => a.company === project.company)
            .slice()
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        if (relatedActivities.length === 0) {
            activitiesContainer.className = 'embedded-list';
            activitiesContainer.innerHTML = '<p class="empty-hint">関連する活動はありません</p>';
        } else {
            activitiesContainer.className = 'embedded-list';
            activitiesContainer.innerHTML = relatedActivities.slice(0, 5).map(item => `
                <article class="act-card" onclick="window.location.hash='activity-detail/${item.id}'">
                    <div class="act-top">
                        <div class="act-title">${item.company}</div>
                        <span class="tag brand">${item.type}</span>
                    </div>
                    <div class="act-mid">
                        <div class="act-assignees">
                            <span>担当 <b>${item.contact}</b></span>
                            <span>営業 <b>${item.salesRep}</b></span>
                        </div>
                        <div class="act-date mono">${formatShortDate(item.date)}</div>
                    </div>
                    ${item.comment ? `<p class="act-snippet">${item.comment}</p>` : ''}
                </article>
            `).join('');
        }
    }

}
