import { Router } from './router.js';

const FRAME_META = {
    access: { num: 1, label: '承認コード · LG01', desc: 'アクセス承認。CRM ログインと同系統の auth card。' },
    login: { num: 2, label: 'ログイン · LG02', desc: 'ユーザー認証後、ホームへ遷移。' },
    home: { num: 3, label: 'ホーム · クイックメニュー', desc: '会社 / 担当者 / 活動 / 案件 / 名刺スキャンへのショートカット。' },
    company: { num: 4, label: '会社 · 一覧', desc: '顧客テンプレートの会社検索・一覧。リストカード UI。' },
    'company-detail': { num: 5, label: '会社 · 詳細', desc: '基本情報・メモ・担当者一覧。section + field-row。' },
    contact: { num: 6, label: '担当者 · 一覧', desc: '担当者検索・詳細検索（ご無沙汰含む）。' },
    'contact-detail': { num: 7, label: '担当者 · 詳細', desc: '連絡先・メモ・自由使用欄。' },
    activity: { num: 8, label: '活動 · 一覧', desc: '活動履歴の検索・フィルタ。' },
    'activity-detail': { num: 9, label: '活動 · 詳細', desc: '活動内容・コメント・自由使用欄。' },
    project: { num: 10, label: '案件 · 一覧', desc: '案件ステータス・話題日での検索。' },
    'project-detail': { num: 11, label: '案件 · 詳細', desc: '案件概要・関連情報。' },
    'scan-result': { num: 12, label: '名刺スキャン · 結果', desc: 'OCR 結果の確認・登録先会社の選択・撮り直し / 続けて撮影。' }
};

function updatePresentation(routeKey) {
    const meta = FRAME_META[routeKey] || { num: '·', label: routeKey, desc: null };
    const labelText = document.getElementById('frame-label-text');
    const labelNum = document.getElementById('frame-num');
    const stageDesc = document.getElementById('stage-desc');

    if (labelText) labelText.textContent = meta.label;
    if (labelNum) labelNum.textContent = String(meta.num);
    if (stageDesc && meta.desc) {
        stageDesc.innerHTML = `${meta.desc} UI トークンは <code>会社_mobile_hifi.html</code> / <code>crm-common.css</code> と同期。`;
    }
}

window.onAppRouteChange = updatePresentation;

const routes = {
    'access': {
        template: '/screens/auth/lg01_access.html',
        container: '#app',
        init: async () => {
            const module = await import('./screens/auth/lg01_access.js');
            module.init();
        }
    },
    'login': {
        template: '/screens/auth/lg02_login.html',
        container: '#app',
        init: async () => {
            const module = await import('./screens/auth/lg02_login.js');
            module.init();
        }
    },
    'home': {
        template: '/screens/home/home.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('ホーム');
            const module = await import('./screens/home/home.js');
            module.init();
        }
    },
    'company': {
        template: '/screens/company/company_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('会社');
            const module = await import('./screens/company/company_list.js');
            module.init();
        }
    },
    'company-detail': {
        template: '/screens/company/company_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('会社詳細', true);
            const module = await import('./screens/company/company_detail.js');
            module.init(params[0]);
        }
    },
    'contact': {
        template: '/screens/contact/contact_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('担当者');
            const module = await import('./screens/contact/contact_list.js');
            module.init();
        }
    },
    'contact-detail': {
        template: '/screens/contact/contact_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('担当者詳細', true);
            const module = await import('./screens/contact/contact_detail.js');
            module.init(params[0]);
        }
    },
    'activity': {
        template: '/screens/activity/activity_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('活動');
            const module = await import('./screens/activity/activity_list.js');
            module.init();
        }
    },
    'activity-detail': {
        template: '/screens/activity/activity_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('活動詳細', true);
            const module = await import('./screens/activity/activity_detail.js');
            module.init(params[0]);
        }
    },
    'project': {
        template: '/screens/project/project_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('案件');
            const module = await import('./screens/project/project_list.js');
            module.init();
        }
    },
    'project-detail': {
        template: '/screens/project/project_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('案件詳細', true);
            const module = await import('./screens/project/project_detail.js');
            module.init(params[0]);
        }
    },
    'scan-result': {
        template: '/screens/scan/scan_result.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('スキャン結果', true);
            const module = await import('./screens/scan/scan_result.js');
            module.init();
        }
    }
};

async function ensureLayout() {
    const app = document.querySelector('#app');
    if (!document.querySelector('.mobile-layout')) {
        const response = await fetch('/components/layout.html');
        const html = await response.text();
        app.innerHTML = html;
        
        // Setup global layout events
        const refreshBtn = document.getElementById('header-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => window.location.reload());
        }
    }
}

function updateHeader(title, showBack = false) {
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.textContent = title;

    const routeKey = (window.location.hash.slice(1) || '').split('/')[0];
    const logoEl = document.getElementById('header-logo');
    // 一覧: SMOS ロゴ + タイトル / 詳細: 戻るのみ / ホーム: タイトルのみ
    if (logoEl) {
        logoEl.style.display = (!showBack && routeKey !== 'home') ? 'inline' : 'none';
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = showBack ? 'inline-flex' : 'none';
        backBtn.onclick = showBack ? () => window.history.back() : null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const isAuth = localStorage.getItem('smos_auth') === 'true';
    const defaultRoute = isAuth ? 'home' : 'access';
    
    const router = new Router(routes, defaultRoute);
    router.init();
    window.appRouter = router;

    const initialKey = (window.location.hash.slice(1) || defaultRoute).split('/')[0];
    updatePresentation(initialKey);
});
