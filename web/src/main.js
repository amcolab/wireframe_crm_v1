import { Router } from './router.js';
import { initGlobalLookups } from './utils/lookups.js';
import { initShellChrome } from './utils/shellChrome.js';

// Setup routes
const routes = {
  'access': {
    template: '/screens/auth/lg01_access.html',
    container: '#app',
    init: async () => {
      const module = await import('./screens/auth/lg01_access.js');
      if (module.init) module.init();
    }
  },
  'login': {
    template: '/screens/auth/lg02_login.html',
    container: '#app',
    init: async () => {
      const module = await import('./screens/auth/lg02_login.js');
      if (module.init) module.init();
    }
  },
  'company': {
    template: '/screens/company/cp01_list.html',
    container: '#router-view',
    beforeEnter: async () => {
      await setupDashboardLayout();
    },
    init: async () => {
      const module = await import('./screens/company/cp01_list.js');
      if (module.init) module.init();
    }
  },
  'contact': {
    template: '/screens/contact/ct01_list.html',
    container: '#router-view',
    beforeEnter: async () => {
      await setupDashboardLayout();
    },
    init: async () => {
      const module = await import('./screens/contact/ct01_list.js');
      if (module.init) module.init();
    }
  },
  'activity': {
    template: '/screens/activity/at01_list.html',
    container: '#router-view',
    beforeEnter: async () => {
      await setupDashboardLayout();
    },
    init: async () => {
      const module = await import('./screens/activity/at01_list.js');
      if (module.init) module.init();
    }
  },
  'project': {
    template: '/screens/project/pr01_list.html',
    container: '#router-view',
    beforeEnter: async () => {
      await setupDashboardLayout();
    },
    init: async () => {
      const module = await import('./screens/project/pr01_list.js');
      if (module.init) module.init();
    }
  }
};

async function setupDashboardLayout() {
  const appContainer = document.querySelector('#app');
  // Only inject layout if it's not already there
  if (!document.querySelector('#dashboard-container')) {
    const response = await fetch('/components/layout.html');
    const layoutHtml = await response.text();
    appContainer.innerHTML = layoutHtml;

    // Show the dashboard container
    document.querySelector('#dashboard-container').classList.add('active');

    // Attach sidebar events
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (section) {
          window.location.hash = section;
        }
      });
    });
    
    initShellChrome();

    // Dynamic Crumbs updating on router transition
    const updateTopbarCrumbs = () => {
      const hash = window.location.hash.replace('#', '') || 'company';
      const screenNames = {
        'company': '会社 (CP01)',
        'contact': '担当 (CT01)',
        'activity': '活動 (AT01)',
        'project': '案件 (PR01)'
      };
      const name = screenNames[hash] || '会社 (CP01)';
      const crumbEl = document.querySelector('#topbarCurrentScreen');
      if (crumbEl) crumbEl.textContent = name;
      
      // Update sidebar active state
      document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.dataset.section === hash) item.classList.add('active');
        else item.classList.remove('active');
      });
    };
    
    window.addEventListener('hashchange', updateTopbarCrumbs);
    updateTopbarCrumbs();

    // Show current dynamic Japanese date (e.g. 2026/05/18 (月))
    const showTopbarDate = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const wdays = ['日', '月', '火', '水', '木', '金', '土'];
      const wday = wdays[d.getDay()];
      const formatted = `${year}/${month}/${date} (${wday})`;
      const dateEl = document.querySelector('#topbarCurrentDate');
      if (dateEl) dateEl.textContent = formatted;
    };
    showTopbarDate();

    // Initialize global lookups for shared dialogs
    initGlobalLookups();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const router = new Router(routes, 'access');
  router.init();
  
  // Attach router to window for global access if needed
  window.appRouter = router;
});
