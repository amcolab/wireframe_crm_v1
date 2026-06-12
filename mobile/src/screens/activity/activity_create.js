import { mockActivities, mockCompanies, mockContacts, mockProjects } from '../../utils/mockData.js';

const ACTIVITY_TYPES = ['電話', '訪問', 'メール', 'WEB商談'];
const DEFAULT_SALES_REP = '澤 貴彦';

let lockedFromContact = false;
let lockedCompanyId = '';
let lockedContactLabel = '';
let lockedCompany = null;

const AUTO_FIELDS = {
    'activity-auto-company': (c) => c?.name || '—',
    'activity-auto-type': (c) => c?.type || '—',
    'activity-auto-tel': (c) => c?.tel || '—',
    'activity-auto-industry': (c) => c?.industry || '—',
    'activity-auto-scale': (c) => c?.scale || '—',
    'activity-auto-postal': (c) => c?.postal || '—',
    'activity-auto-pref': (c) => c?.pref || '—',
    'activity-auto-addr': (c) => c?.addr || '—'
};

function getUniqueCompanies() {
    const seen = new Set();
    return mockCompanies.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
    });
}

function getSalesReps() {
    const reps = new Set(mockActivities.map((a) => a.salesRep).filter(Boolean));
    reps.add(DEFAULT_SALES_REP);
    return [...reps];
}

function formatDateForStorage(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${y}/${m}/${d}`;
}

function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
}

function findCompanyById(id) {
    if (!id) return null;
    if (lockedFromContact && lockedCompanyId === id && lockedCompany) {
        return lockedCompany;
    }
    return mockCompanies.find((c) => c.id === id) || null;
}

function findContactByLabel(companyName, label) {
    if (!companyName || !label) return null;
    return mockContacts.find((c) => {
        const name = `${c.last} ${c.first}`.trim();
        return c.company === companyName && name === label;
    });
}

function findContactById(id) {
    return mockContacts.find((c) => c.id === id) || null;
}

function setSelectLocked(select, locked) {
    if (!select) return;
    select.disabled = locked;
    select.closest('.form-field')?.classList.toggle('form-field-locked', locked);
}

function setLockedFieldNote(fieldId, message) {
    const field = document.getElementById(fieldId)?.closest('.form-field');
    if (!field) return;

    let note = field.querySelector('.form-lock-note');
    if (!message) {
        note?.remove();
        return;
    }

    if (!note) {
        note = document.createElement('span');
        note.className = 'form-lock-note';
        field.appendChild(note);
    }
    note.textContent = message;
}

function resolveCompanyForContact(contact) {
    const found = mockCompanies.find((c) => c.name === contact.company);
    if (found) return found;

    return {
        id: `contact-company-${contact.id}`,
        name: contact.company,
        tel: contact.tel || '—',
        type: '—',
        industry: '—',
        scale: '—',
        postal: '—',
        pref: '—',
        addr: '—'
    };
}

function applyContactPrefill(contactId) {
    const contact = findContactById(contactId);
    if (!contact) return false;

    const company = resolveCompanyForContact(contact);
    if (!company?.id) return false;

    lockedFromContact = true;
    lockedCompanyId = company.id;
    lockedContactLabel = `${contact.last} ${contact.first}`.trim();
    lockedCompany = company;

    populateCompanySelect(lockedCompanyId, company);
    populateContactSelect(company.name);

    if (!mockContacts.some((c) => c.company === company.name && `${c.last} ${c.first}`.trim() === lockedContactLabel)) {
        const contactSelect = document.getElementById('activity-create-contact');
        if (contactSelect) {
            const opt = document.createElement('option');
            opt.value = lockedContactLabel;
            opt.textContent = lockedContactLabel;
            contactSelect.appendChild(opt);
        }
    }

    const contactSelect = document.getElementById('activity-create-contact');
    if (contactSelect) contactSelect.value = lockedContactLabel;

    setSelectLocked(document.getElementById('activity-create-company'), true);
    setSelectLocked(contactSelect, true);
    setLockedFieldNote('activity-create-company', '担当者詳細からのため変更できません');
    setLockedFieldNote('activity-create-contact', '担当者詳細からのため変更できません');
    updateAutoCompanySection(company);
    populateProjectSelect(company.name);
    updateContactDept();
    updateProjectIdDisplay();
    return true;
}

function releaseContactPrefillLock() {
    lockedFromContact = false;
    lockedCompanyId = '';
    lockedContactLabel = '';
    lockedCompany = null;
    setSelectLocked(document.getElementById('activity-create-company'), false);
    setSelectLocked(document.getElementById('activity-create-contact'), false);
    setLockedFieldNote('activity-create-company', '');
    setLockedFieldNote('activity-create-contact', '');
}

function calcDurationMinutes(start, end) {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return '';
    const mins = eh * 60 + em - (sh * 60 + sm);
    return mins > 0 ? String(mins) : '';
}

function updateDurationDisplay() {
    const start = document.getElementById('activity-create-start')?.value;
    const end = document.getElementById('activity-create-end')?.value;
    const mins = calcDurationMinutes(start, end);
    setText('activity-auto-duration', mins ? `${mins} 分` : '—');
}

function updateAutoCompanySection(company) {
    const section = document.getElementById('activity-auto-section');
    if (!section) return;

    if (!company) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    Object.entries(AUTO_FIELDS).forEach(([id, fn]) => setText(id, fn(company)));
    updateContactDept();
}

function updateContactDept() {
    const companySelect = document.getElementById('activity-create-company');
    const contactSelect = document.getElementById('activity-create-contact');
    const company = findCompanyById(companySelect?.value);
    const contact = findContactByLabel(company?.name, contactSelect?.value);
    setText('activity-auto-dept', contact?.dept || '—');
}

function updateProjectIdDisplay() {
    const companySelect = document.getElementById('activity-create-company');
    const projectSelect = document.getElementById('activity-create-project');
    const company = findCompanyById(companySelect?.value);
    const project = mockProjects.find(
        (p) => p.company === company?.name && p.name === projectSelect?.value
    );
    setText('activity-auto-project-id', project?.id ? `PJ-${project.id}` : '—');
}

function populateCompanySelect(preselectedId, extraCompany = null) {
    const select = document.getElementById('activity-create-company');
    if (!select) return;

    const companies = getUniqueCompanies();
    if (extraCompany && !companies.some((c) => c.id === extraCompany.id || c.name === extraCompany.name)) {
        companies.push(extraCompany);
    }

    select.innerHTML = '<option value="">選択してください</option>';
    companies.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    if (preselectedId) select.value = preselectedId;
    if (!lockedFromContact) {
        select.dispatchEvent(new Event('change'));
    }
}

function populateSalesRepSelect() {
    const select = document.getElementById('activity-create-salesrep');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    getSalesReps().forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    select.value = current || DEFAULT_SALES_REP;
}

function populateContactSelect(companyName) {
    const select = document.getElementById('activity-create-contact');
    if (!select) return;

    select.innerHTML = '<option value="">選択してください</option>';
    if (!companyName) return;

    mockContacts
        .filter((c) => c.company === companyName)
        .forEach((c) => {
            const opt = document.createElement('option');
            const label = `${c.last} ${c.first}`.trim();
            opt.value = label;
            opt.textContent = label;
            select.appendChild(opt);
        });
}

function populateProjectSelect(companyName) {
    const select = document.getElementById('activity-create-project');
    if (!select) return;

    select.innerHTML = '<option value="">選択なし</option>';
    if (!companyName) return;

    mockProjects
        .filter((p) => p.company === companyName)
        .forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
}

function getSelectedType() {
    const btn = document.querySelector('#activity-type-pick button.active');
    const type = btn?.dataset.type || '電話';
    return type === 'WEB' ? 'WEB商談' : type;
}

function setupTypePicker() {
    const pick = document.getElementById('activity-type-pick');
    if (!pick) return;

    pick.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-type]');
        if (!btn) return;
        pick.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
    });
}

function collectForm() {
    const company = findCompanyById(document.getElementById('activity-create-company')?.value);
    const duration = calcDurationMinutes(
        document.getElementById('activity-create-start')?.value,
        document.getElementById('activity-create-end')?.value
    );

    return {
        company: company?.name || '',
        date: formatDateForStorage(document.getElementById('activity-create-date')?.value),
        type: getSelectedType(),
        purpose: document.getElementById('activity-create-purpose')?.value || '',
        contact: document.getElementById('activity-create-contact')?.value || '',
        salesRep: document.getElementById('activity-create-salesrep')?.value || '',
        motivation: document.getElementById('activity-create-motivation')?.value || '',
        projectName: document.getElementById('activity-create-project')?.value || '',
        startTime: document.getElementById('activity-create-start')?.value || '',
        endTime: document.getElementById('activity-create-end')?.value || '',
        duration,
        attendees: document.getElementById('activity-create-attendees')?.value || '',
        comment: document.getElementById('activity-create-comment')?.value?.trim() || ''
    };
}

function validateForm(data) {
    if (!data.company) {
        alert('会社名を選択してください');
        document.getElementById('activity-create-company')?.focus();
        return false;
    }
    if (!data.contact) {
        alert('担当者を選択してください');
        document.getElementById('activity-create-contact')?.focus();
        return false;
    }
    if (!data.salesRep) {
        alert('営業担当を選択してください');
        document.getElementById('activity-create-salesrep')?.focus();
        return false;
    }
    if (!data.date) {
        alert('活動日を入力してください');
        document.getElementById('activity-create-date')?.focus();
        return false;
    }
    if (!data.startTime) {
        alert('開始時刻を入力してください');
        document.getElementById('activity-create-start')?.focus();
        return false;
    }
    if (!ACTIVITY_TYPES.includes(data.type)) {
        alert('活動タイプを選択してください');
        return false;
    }
    return true;
}

function setActiveType(type) {
    const pick = document.getElementById('activity-type-pick');
    if (!pick) return;
    const uiType = type === 'WEB商談' ? 'WEB' : type;
    pick.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.dataset.type === uiType);
    });
}

function clearForm() {
    const companySelect = document.getElementById('activity-create-company');
    if (!lockedFromContact && companySelect) companySelect.value = '';

    const dateInput = document.getElementById('activity-create-date');
    if (dateInput) dateInput.value = todayIso();

    setActiveType('電話');

    [
        'activity-create-purpose',
        'activity-create-motivation',
        'activity-create-start',
        'activity-create-end',
        'activity-create-attendees',
        'activity-create-comment'
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['activity-flag-follow', 'activity-flag-appt', 'activity-flag-claim'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });

    if (lockedFromContact) {
        const company = findCompanyById(lockedCompanyId);
        populateCompanySelect(lockedCompanyId);
        populateContactSelect(company?.name);
        const contactSelect = document.getElementById('activity-create-contact');
        if (contactSelect) contactSelect.value = lockedContactLabel;
        setSelectLocked(companySelect, true);
        setSelectLocked(contactSelect, true);
        updateAutoCompanySection(company);
        updateContactDept();
    } else {
        populateContactSelect('');
        populateProjectSelect('');
        updateAutoCompanySection(null);
        setText('activity-auto-dept', '—');
    }

    populateProjectSelect(lockedFromContact ? findCompanyById(lockedCompanyId)?.name : '');
    populateSalesRepSelect();
    setText('activity-auto-project-id', '—');
    setText('activity-auto-duration', '—');
    setText('activity-auto-id', '保存時に自動採番');

    const startInput = document.getElementById('activity-create-start');
    if (startInput) startInput.value = '09:00';
}

function registerActivity(data) {
    const id = `a${Date.now()}`;
    mockActivities.unshift({
        id,
        company: data.company,
        date: data.date,
        type: data.type,
        contact: data.contact,
        salesRep: data.salesRep,
        purpose: data.purpose,
        motivation: data.motivation,
        projectName: data.projectName,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        attendees: data.attendees,
        comment: data.comment,
        free1: '',
        free2: '',
        free3: '',
        free4: '',
        free5: ''
    });
    return id;
}

export function init(params = []) {
    releaseContactPrefillLock();

    const fromContactId = params[0] === 'from-contact' ? params[1] : '';
    let prefillCompanyId = '';

    if (fromContactId) {
        prefillCompanyId = '';
    } else if (params[0] && params[0] !== 'from-contact') {
        prefillCompanyId = params[0];
    } else {
        prefillCompanyId = localStorage.getItem('prefill_activity_company_id') || '';
        if (prefillCompanyId) localStorage.removeItem('prefill_activity_company_id');
    }

    const dateInput = document.getElementById('activity-create-date');
    if (dateInput && !dateInput.value) dateInput.value = todayIso();

    const startInput = document.getElementById('activity-create-start');
    if (startInput && !startInput.value) startInput.value = '09:00';

    setupTypePicker();
    populateSalesRepSelect();
    populateCompanySelect(prefillCompanyId);

    if (fromContactId) {
        applyContactPrefill(fromContactId);
    }

    const companySelect = document.getElementById('activity-create-company');
    companySelect?.addEventListener('change', () => {
        if (lockedFromContact) return;
        const company = findCompanyById(companySelect.value);
        updateAutoCompanySection(company);
        populateContactSelect(company?.name);
        populateProjectSelect(company?.name);
        updateProjectIdDisplay();
    });

    document.getElementById('activity-create-contact')?.addEventListener('change', updateContactDept);

    document.getElementById('activity-create-project')?.addEventListener('change', updateProjectIdDisplay);

    startInput?.addEventListener('change', updateDurationDisplay);
    document.getElementById('activity-create-end')?.addEventListener('change', updateDurationDisplay);

    document.getElementById('btn-clear-activity')?.addEventListener('click', clearForm);

    document.getElementById('btn-submit-activity')?.addEventListener('click', () => {
        const data = collectForm();
        if (!validateForm(data)) return;

        const id = registerActivity(data);
        alert('活動を保存しました');
        window.location.hash = `activity-detail/${id}`;
    });
}
