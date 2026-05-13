import { Router } from './router.js';

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
        document.querySelector('.header-action').addEventListener('click', () => {
            window.location.reload();
        });
    }
}

function updateHeader(title, showBack = false) {
    const titleEl = document.querySelector('.header-title');
    if (titleEl) {
        titleEl.textContent = title;
    }
    
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = showBack ? 'block' : 'none';
        if (showBack && !backBtn.onclick) {
            backBtn.onclick = () => window.history.back();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const isAuth = localStorage.getItem('smos_auth') === 'true';
    const defaultRoute = isAuth ? 'home' : 'access';
    
    const router = new Router(routes, defaultRoute);
    router.init();
    window.appRouter = router;
});
