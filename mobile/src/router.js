export class Router {
    constructor(routes, defaultRoute) {
        this.routes = routes;
        this.defaultRoute = defaultRoute;
        this.currentRoute = null;
        this.container = document.querySelector('#app');
    }

    async init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        await this.handleRoute();
    }

    async handleRoute() {
        let hash = window.location.hash.substring(1) || this.defaultRoute;
        
        // Support parameters like #activity/123
        const parts = hash.split('/');
        const routeKey = parts[0];
        const params = parts.slice(1);

        const route = this.routes[routeKey];
        if (!route) {
            window.location.hash = this.defaultRoute;
            return;
        }

        this.currentRoute = routeKey;

        // Render template
        try {
            const response = await fetch(route.template);
            const html = await response.text();
            
            // If the route has a container, use it, otherwise use main scroll area
            const targetContainer = document.querySelector(route.container || '#main-content');
            if (targetContainer) {
                targetContainer.innerHTML = html;
                targetContainer.scrollTop = 0;
            } else {
                // If main-content doesn't exist yet (first load), we might need to inject layout
                if (route.beforeEnter) {
                    await route.beforeEnter();
                }
                const newTargetContainer = document.querySelector(route.container || '#main-content');
                if (newTargetContainer) {
                    newTargetContainer.innerHTML = html;
                }
            }

            // Initialize route specific logic
            if (route.init) {
                await route.init(params);
            }

            // Update active nav item
            this.updateActiveNav(routeKey);

            if (typeof window.onAppRouteChange === 'function') {
                window.onAppRouteChange(routeKey);
            }
        } catch (error) {
            console.error('Error loading route:', error);
        }
    }

    updateActiveNav(routeKey) {
        const navMap = {
            'company-detail': 'company',
            'contact-detail': 'contact',
            'activity-detail': 'activity',
            'project-detail': 'project',
            'scan-result': 'home'
        };
        const active = navMap[routeKey] || routeKey;
        document.querySelectorAll('.tab-item, .nav-item').forEach(item => {
            const section = item.getAttribute('href')?.substring(1) || item.dataset.nav;
            item.classList.toggle('active', section === active);
        });
    }
}
