// Initialize the application
import { get, set, subscribe } from './state.js';
import { events } from './events.js';
import { router } from './router.js';

/**
 * Main application controller
 * Handles initialization, events, and coordination between modules
 */
class AppController {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
    this.plugins = [];
  }

  /**
   * Register a module with the application
   * @param {string} name - Module name
   * @param {Object} module - Module instance
   */
  registerModule(name, module) {
    this.modules.set(name, module);
    
    // If module has init method and app is already initialized, call it
    if (this.initialized && typeof module.init === 'function') {
      module.init();
    }
    
    return this;
  }

  /**
   * Get a registered module
   * @param {string} name - Module name
   * @returns {Object} Module instance
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Initialize all registered modules
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[DEBUG] Initializing Creative Code Platform...');
    console.log(`[DEBUG] Total modules registered: ${this.modules.size}`);
    
    // Initialize modules
    for (const [name, module] of this.modules) {
      console.log(`[DEBUG] Checking module: ${name}`);
      if (typeof module.init === 'function') {
        try {
          console.log(`[DEBUG] Initializing module: ${name}`);
          await module.init();
          console.log(`[DEBUG] Module "${name}" initialized successfully`);
        } catch (error) {
          console.error(`[DEBUG] Failed to initialize module "${name}":`, error);
        }
      } else {
        console.log(`[DEBUG] Module "${name}" has no init function`);
      }
    }
    
    // Set app as initialized
    this.initialized = true;
    
    // Dispatch initialization event
    events.dispatch('app:ready');
    
    console.log('[DEBUG] Creative Code Platform is ready');
  }

  /**
   * Start the application
   */
  async start() {
    console.log('[DEBUG] Starting Creative Code Platform...');
    
    // Initialize state with default values
    this.defaultState();
    
    // Router setup
    router.parse(window.location.hash.replace('#', ''));
    
    // Initialize all modules
    await this.initialize();
    
    console.log('[DEBUG] App.start() complete');
  }

  /**
   * Set default state values
   */
  defaultState() {
    set('currentProject', null);
    set('currentFile', null);
    set('projects', []);
    set('connectedGitHub', false);
    set('libraries', [
      { name: 'p5.js', version: '1.9.0', url: 'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js', enabled: true }
    ]);
  }

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    events.on(event, handler);
  }

  /**
   * Unsubscribe from events
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    events.off(event, handler);
  }

  /**
   * Dispatch custom event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  dispatch(event, data) {
    events.dispatch(event, data);
  }
}

// Export singleton instance
export const app = new AppController();
