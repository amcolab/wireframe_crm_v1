import { mockCompanies } from '../../utils/mockData.js';

const FIELD_IDS = [
    'scan-name',
    'scan-dept',
    'scan-email',
    'scan-tel',
    'scan-fax',
    'scan-mobile',
    'scan-postal',
    'scan-addr'
];

const SCAN_PRESETS = [
    {
        ocrCompany: '株式会社ボウルズ',
        companyId: '1219',
        values: {
            'scan-name': '中谷 太輔',
            'scan-dept': '営業企画部',
            'scan-email': 'nakatani@bowls.co.jp',
            'scan-tel': '06-6210-2765',
            'scan-fax': '06-6210-2766',
            'scan-mobile': '080-1234-5678',
            'scan-postal': '542-0081',
            'scan-addr': '大阪市中央区南船場 4-12-8 関西心斎橋ビル 804'
        }
    },
    {
        ocrCompany: 'イオンリテール株式会社',
        companyId: '1068',
        values: {
            'scan-name': '高橋 翔太',
            'scan-dept': '店舗開発部',
            'scan-email': 'takahashi@aeonretail.co.jp',
            'scan-tel': '06-6210-2765',
            'scan-fax': '06-6210-2766',
            'scan-mobile': '090-1111-2222',
            'scan-postal': '542-0081',
            'scan-addr': '大阪市中央区南船場 4-12-8 関西心斎橋ビル 8階'
        }
    },
    {
        ocrCompany: '旭川エレクトロニクスサービス株式会社',
        companyId: '1141',
        values: {
            'scan-name': '渡辺 沙織',
            'scan-dept': 'ロジスティクス部',
            'scan-email': 'watanabe.saori@c10250.co.jp',
            'scan-tel': '012-4294-2357',
            'scan-fax': '06-6210-2766',
            'scan-mobile': '070-7122-8116',
            'scan-postal': '542-0081',
            'scan-addr': '北海道旭川市東区4丁目18-30'
        }
    }
];

let presetIndex = 0;
let companyOptions = [];

function getUniqueCompanies() {
    const seen = new Set();
    return mockCompanies.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
    });
}

function populateCompanySelect() {
    const select = document.getElementById('scan-company');
    if (!select) return;

    companyOptions = getUniqueCompanies();
    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    companyOptions.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
    if (current) select.value = current;
}

function findCompanyById(id) {
    return mockCompanies.find((c) => c.id === id);
}

function findCompanyByName(name) {
    return mockCompanies.find((c) => c.name === name);
}

function applyCompanyFields(company) {
    if (!company) return;
    const map = {
        'scan-tel': company.tel,
        'scan-fax': company.fax,
        'scan-postal': company.postal,
        'scan-addr': company.addr
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    });
}

function applyPreset(index, { keepCompany = false } = {}) {
    const preset = SCAN_PRESETS[index % SCAN_PRESETS.length];
    presetIndex = index % SCAN_PRESETS.length;

    FIELD_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = preset.values[id] || '';
    });

    const ocrHint = document.getElementById('scan-ocr-company');
    if (ocrHint) ocrHint.textContent = `名刺読取: ${preset.ocrCompany}`;

    const select = document.getElementById('scan-company');
    if (select && !keepCompany) {
        const match = findCompanyByName(preset.ocrCompany) || findCompanyById(preset.companyId);
        select.value = match?.id || preset.companyId || '';
        if (select.value) applyCompanyFields(findCompanyById(select.value));
    }
}

function getFormValues() {
    const values = {};
    FIELD_IDS.forEach((id) => {
        const el = document.getElementById(id);
        values[id] = el?.value?.trim() || '';
    });
    const select = document.getElementById('scan-company');
    values.companyId = select?.value || '';
    values.companyName = select?.selectedOptions?.[0]?.textContent?.trim() || '';
    return values;
}

function validateForRegister() {
    const { companyId, 'scan-name': name } = getFormValues();
    if (!companyId) {
        alert('登録先会社を選択してください');
        document.getElementById('scan-company')?.focus();
        return false;
    }
    if (!name) {
        alert('担当者名を入力してください');
        document.getElementById('scan-name')?.focus();
        return false;
    }
    return true;
}

function registerContact({ thenContinue = false } = {}) {
    if (!validateForRegister()) return false;

    const { companyName, 'scan-name': name } = getFormValues();
    alert(`「${name}」を${companyName}に登録しました`);

    if (thenContinue) {
        presetIndex = (presetIndex + 1) % SCAN_PRESETS.length;
        applyPreset(presetIndex);
        document.getElementById('scan-name')?.focus();
    }

    return true;
}

function simulateCapture(message) {
    alert(message);
}

export function init() {
    populateCompanySelect();
    applyPreset(presetIndex);

    const companySelect = document.getElementById('scan-company');
    if (companySelect) {
        companySelect.addEventListener('change', () => {
            applyCompanyFields(findCompanyById(companySelect.value));
        });
    }

    document.getElementById('btn-register-scan')?.addEventListener('click', () => {
        registerContact();
    });

    document.getElementById('btn-clear-scan')?.addEventListener('click', () => {
        FIELD_IDS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (companySelect) companySelect.value = '';
        const ocrHint = document.getElementById('scan-ocr-company');
        if (ocrHint) ocrHint.textContent = '名刺読取: —';
    });

    document.getElementById('btn-retake-scan')?.addEventListener('click', () => {
        simulateCapture('カメラを起動します（ワイヤーフレーム）');
        applyPreset(presetIndex);
    });

    document.getElementById('btn-continue-scan')?.addEventListener('click', () => {
        if (!registerContact({ thenContinue: true })) return;
        simulateCapture('次の名刺を撮影します（ワイヤーフレーム）');
    });
}
