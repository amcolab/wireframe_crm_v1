import { mockCompanies, mockContacts, mockActivities, mockProjects } from '../../utils/mockData.js';

export function init(id) {
    const company = mockCompanies.find(c => c.id === id);
    if (company) {
        fillDetail(company);
        setupMemo(company);
        setupSegTabs();
        setupHeroActions(company);
        renderContacts(company.name);
        updateRelatedCounts(company.name);
    }
}

function fillDetail(company) {
    const heroSub = document.getElementById('company-hero-sub');
    if (heroSub) {
        const parts = [];
        if (company.id) parts.push(`<span class="pill">CO-${company.id}</span>`);
        if (company.industry) parts.push(`<span>${company.industry}</span>`);
        if (company.type) parts.push('<span>·</span>', `<span>${company.type}</span>`);
        heroSub.innerHTML = parts.join('') || '—';
    }

    const districtWrap = document.getElementById('company-district-wrap');
    if (districtWrap) {
        districtWrap.innerHTML = company.district
            ? `<span class="chip-inline gray">${company.district}</span>`
            : '-';
    }

    const scaleWrap = document.getElementById('company-scale-wrap');
    if (scaleWrap) {
        scaleWrap.innerHTML = company.scale
            ? `<span class="chip-inline">${company.scale}</span>`
            : '-';
    }

    const fields = {
        'company-name': company.name,
        'company-name-field': company.name,
        'company-id': `CO-${company.id}`,
        'company-postal': company.postal,
        'company-pref': company.pref,
        'company-addr': company.addr,
        'company-tel': company.tel,
        'company-fax': company.fax,
        'company-industryGroup': company.industryGroup,
        'company-industry': company.industry,
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

    for (const [fieldId, value] of Object.entries(fields)) {
        const el = document.getElementById(fieldId);
        if (!el) continue;
        if (fieldId === 'company-tel' && value) {
            el.innerHTML = `<a href="tel:${value}" class="link mono">${value}</a>`;
        } else {
            el.textContent = value || '-';
        }
    }
}

function setupHeroActions(company) {
    const telBtn = document.querySelector('.hero-actions .ha-btn[aria-label="電話"]');
    if (telBtn && company.tel) {
        telBtn.addEventListener('click', () => { window.location.href = `tel:${company.tel}`; });
    }
}

function setupSegTabs() {
    const seg = document.getElementById('company-detail-seg');
    if (!seg) return;

    const buttons = seg.querySelectorAll('button[data-tab]');
    const panels = document.querySelectorAll('.detail-tab-panel');

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            buttons.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            panels.forEach((panel) => {
                panel.hidden = panel.dataset.tabPanel !== tab;
            });
        });
    });
}

function updateRelatedCounts(companyName) {
    const contactCnt = mockContacts.filter((c) => c.company === companyName).length;
    const activityCnt = mockActivities.filter((a) => a.company === companyName).length;
    const projectCnt = mockProjects.filter((p) => p.company === companyName).length;

    const setCnt = (id, n) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(n);
    };
    setCnt('company-contact-cnt', contactCnt);
    setCnt('company-activity-cnt', activityCnt);
    setCnt('company-project-cnt', projectCnt);
}

function setupMemo(company) {
    const memoEl = document.getElementById('company-memo');
    if (!memoEl) return;

    const savedMemo = localStorage.getItem(`memo_company_${company.id}`);
    memoEl.value = savedMemo !== null ? savedMemo : (company.memo || '');

    memoEl.addEventListener('input', (e) => {
        localStorage.setItem(`memo_company_${company.id}`, e.target.value);
    });
}

function renderContacts(companyName) {
    const container = document.getElementById('company-contacts-list');
    if (!container) return;

    const contacts = mockContacts.filter(c => c.company === companyName);

    if (contacts.length === 0) {
        container.innerHTML = '<p class="empty-hint">登録されている担当者はいません</p>';
        return;
    }

    container.innerHTML = contacts.map(c => `
        <div class="contact-block" role="button" tabindex="0" onclick="window.location.hash='contact-detail/${c.id}'">
            <h4>${c.last} ${c.first}</h4>
            <p class="sub">${c.company}${c.dept ? ' · ' + c.dept : ''}</p>
            <dl class="ct-contact-grid">
                <dt>代表TEL</dt><dd>${c.tel || '-'}</dd>
                <dt>携帯</dt><dd>${c.mobile || '-'}</dd>
                <dt>Email</dt><dd>${c.email || '-'}</dd>
            </dl>
        </div>
    `).join('');
}
