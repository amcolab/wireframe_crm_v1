import { Router } from './router.js';

const routes = {
    'login': {
        template: '/src/screens/auth/login.html',
        container: '#app', // Login screen takes over the whole app area
        init: async () => {
            const module = await import('./screens/auth/login.js');
            module.init();
        }
    },
    'home': {
        template: '/src/screens/home/home.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('ホーム');
            const module = await import('./screens/home/home.js');
            module.init();
        }
    },
    'company': {
        template: '/src/screens/company/company_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('会社');
            const module = await import('./screens/company/company_list.js');
            module.init();
        }
    },
    'company-detail': {
        template: '/src/screens/company/company_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('会社詳細', true);
            const module = await import('./screens/company/company_detail.js');
            module.init(params[0]);
        }
    },
    'contact': {
        template: '/src/screens/contact/contact_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('担当者');
            const module = await import('./screens/contact/contact_list.js');
            module.init();
        }
    },
    'contact-detail': {
        template: '/src/screens/contact/contact_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('担当者詳細', true);
            const module = await import('./screens/contact/contact_detail.js');
            module.init(params[0]);
        }
    },
    'activity': {
        template: '/src/screens/activity/activity_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('活動');
            const module = await import('./screens/activity/activity_list.js');
            module.init();
        }
    },
    'activity-detail': {
        template: '/src/screens/activity/activity_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('活動詳細', true);
            const module = await import('./screens/activity/activity_detail.js');
            module.init(params[0]);
        }
    },
    'project': {
        template: '/src/screens/project/project_list.html',
        beforeEnter: ensureLayout,
        init: async () => {
            updateHeader('案件');
            const module = await import('./screens/project/project_list.js');
            module.init();
        }
    },
    'project-detail': {
        template: '/src/screens/project/project_detail.html',
        beforeEnter: ensureLayout,
        init: async (params) => {
            updateHeader('案件詳細', true);
            const module = await import('./screens/project/project_detail.js');
            module.init(params[0]);
        }
    }
};

async function ensureLayout() {
    const app = document.querySelector('#app');
    if (!document.querySelector('.mobile-layout')) {
        const response = await fetch('/src/components/layout.html');
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
    const defaultRoute = isAuth ? 'home' : 'login';
    
    const router = new Router(routes, defaultRoute);
    router.init();
    window.appRouter = router;
});
