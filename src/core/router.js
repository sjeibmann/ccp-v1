import { get, set, subscribe, unsubscribe } from './state.js';

/**
 * Simple hash-based router
 * Supports routes:
 * - / (home)
 * - /project/:id (project view)
 * - /settings
 */
class Router {
  constructor() {
    this.routes = {
      '/': 'home',
      '/project/:id': 'project',
      '/settings': 'settings'
    };
    
    this.currentPath = window.location.hash.replace('#', '') || '/';
    this.params = {};
    
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      this.parse(window.location.hash.replace('#', ''));
    });
  }

  /**
   * Parse URL and extract route and parameters
   * @param {string} path - URL path to parse
   */
  parse(path) {
    this.currentPath = path ||('/');
    this.params = {};
    
    // Try to match current path with routes
    for (const route in this.routes) {
      const regex = this.pathToRegex(route);
      const match = path.match(regex);
      
      if (match) {
        this.currentRoute = this.routes[route];
        // Extract Named Parameters
        const keys = route.match(/:\w+/g) || [];
        keys.forEach((key, index) => {
          this.params[key.replace(':', '')] = match[index + 1];
        });
        return;
      }
    }
    
    this.currentRoute = 'unknown';
  }

  /**
   * Convert path pattern to regex
   * @param {string} path - Path pattern (e.g., '/project/:id')
   * @returns {RegExp} Regex for matching
   */
  pathToRegex(path) {
    const keys = [];
    const regex = path
      .replace(/:\w+/g, (match) => {
        keys.push(match.replace(':', ''));
        return '([^/]+)';
      })
      .replace(/\/?\.*/, '(?:\\/|$)');
    
    return new RegExp(`^${regex}`, 'i');
  }

  /**
   * Navigate to a path
   * @param {string} path - Path to navigate to
   * @param {Object} [params] - Parameters for the route
   */
  navigate(path, params = {}) {
    // Replace params if present
    let targetPath = path;
    for (const key in params) {
      targetPath = targetPath.replace(`:${key}`, params[key]);
    }
    
    // Update URL hash
    window.location.hash = targetPath;
    this.parse(targetPath);
  }

  /**
   * Get current route name
   * @returns {string} Current route name
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get current parameters
   * @returns {Object} Route parameters
   */
  getParams() {
    return this.params;
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }
}

// Export singleton instance
export const router = new Router();
