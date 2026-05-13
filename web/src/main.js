import { Router } from './router.js';
import { initGlobalLookups } from './utils/lookups.js';

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
        window.location.hash = section;
      });
    });
    
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
