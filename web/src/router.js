export class Router {
  constructor(routes, defaultRoute) {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentRoute = null;
    this.isTransitioning = false;

    window.addEventListener('hashchange', () => this.handleRouteChange());
  }

  init() {
    this.handleRouteChange();
  }

  async handleRouteChange() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      let hash = window.location.hash.substring(1) || this.defaultRoute;
      const route = this.routes[hash];

      if (!route) {
        console.error(`Route not found: ${hash}`);
        this.isTransitioning = false;
        return;
      }

      this.currentRoute = hash;

      // 1. Pre-init (e.g. setup layout)
      if (route.beforeEnter) {
        await route.beforeEnter();
      }

      // 2. Fetch HTML content
      const response = await fetch(route.template);
      if (!response.ok) throw new Error(`Failed to load ${route.template}`);
      const html = await response.text();

      // 3. Inject HTML
      const container = await this.waitForContainer(route.container);
      if (container) {
        container.innerHTML = html;
      } else {
        throw new Error(`Container not found: ${route.container}. Ensure layout is loaded before injection.`);
      }

      // 4. Initialize JS module
      if (route.init) {
        await route.init();
      }

      // Update sidebar active state if applicable
      this.updateSidebar(hash);

    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  updateSidebar(hash) {
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === hash) {
        item.classList.add('active');
      }
    });
  }

  navigate(path) {
    window.location.hash = path;
  }

  async waitForContainer(selector, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise(r => setTimeout(r, 50));
    }
    return null;
  }
}
