const SCAN_DEFAULTS = {
    'scan-name': '中谷 太輔',
    'scan-company': '株式会社ボウルズ',
    'scan-dept': '営業企画部',
    'scan-email': 'nakatani@bowls.co.jp',
    'scan-tel': '06-6210-2765',
    'scan-fax': '06-6210-2766',
    'scan-mobile': '080-1234-5678',
    'scan-postal': '542-0081',
    'scan-addr': '大阪市中央区南船場 4-12-8 関西心斎橋ビル 804'
};

export function init() {
    const registerBtn = document.getElementById('btn-register-scan');
    const clearBtn = document.getElementById('btn-clear-scan');

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            alert('登録が完了しました');
            window.location.hash = 'home';
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            Object.entries(SCAN_DEFAULTS).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        });
    }
}
