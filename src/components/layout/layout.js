/**
 * Layout Manager - Handles editor/preview layout
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const Layout = {
  name: 'layout',
  sidebarVisible: true,
  previewVisible: true,
  consoleVisible: true,
  currentLayout: 'split',
  
  /**
   * Initialize layout manager
   */
  async init() {
    console.log('Initializing Layout module...');
    
    // Load saved preferences from state
    this.sidebarVisible = get('sidebarVisible') !== false;
    this.previewVisible = get('previewVisible') !== false;
    this.consoleVisible = get('consoleVisible') !== false;
    this.currentLayout = get('currentLayout') || 'split';
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Apply initial layout
    this.applyLayout();
    
    console.log('Layout module initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('layout:toggle-sidebar', () => {
      this.toggleSidebar();
    });
    
    events.on('layout:toggle-preview', () => {
      this.togglePreview();
    });
    
    events.on('layout:toggle-console', () => {
      this.toggleConsole();
    });
    
    events.on('layout:toggle-fullscreen', () => {
      this.toggleFullscreen();
    });
    
    events.on('layout:restore', () => {
      this.restoreLayout();
    });
  },
  
  /**
   * Apply the current layout
   */
  applyLayout() {
    const main = document.getElementById('main');
    const sidebar = document.getElementById('sidebar');
    const preview = document.getElementById('preview');
    const consolePanel = document.getElementById('console-panel');
    
    if (!main || !sidebar || !preview || !consolePanel) {
      return;
    }
    
    // Sidebar visibility
    if (this.sidebarVisible) {
      sidebar.classList.remove('hidden', 'collapsed');
    } else {
      sidebar.classList.add('collapsed');
    }
    
    // Preview visibility
    if (this.previewVisible) {
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
    
    // Console visibility
    if (this.consoleVisible) {
      consolePanel.classList.remove('hidden');
    } else {
      consolePanel.classList.add('hidden');
    }
    
    // Adjust layout based on visibility
    if (!this.previewVisible) {
      // Editor full width
      main.style.flexDirection = 'row';
      main.style.flexWrap = 'nowrap';
    } else if (!this.sidebarVisible) {
      // Preview full width
      main.style.flexDirection = 'row';
      main.style.flexWrap = 'nowrap';
    } else {
      // Split view
      main.style.flexDirection = 'row';
      main.style.flexWrap = 'nowrap';
    }
    
    // Store current layout
    set('currentLayout', this.currentLayout);
  },
  
  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    set('sidebarVisible', this.sidebarVisible);
    events.dispatch('layout:sidebarToggle', { visible: this.sidebarVisible });
    this.applyLayout();
  },
  
  /**
   * Toggle preview visibility
   */
  togglePreview() {
    this.previewVisible = !this.previewVisible;
    set('previewVisible', this.previewVisible);
    events.dispatch('layout:previewToggle', { visible: this.previewVisible });
    this.applyLayout();
  },
  
  /**
   * Toggle console visibility
   */
  toggleConsole() {
    this.consoleVisible = !this.consoleVisible;
    set('consoleVisible', this.consoleVisible);
    events.dispatch('layout:consoleToggle', { visible: this.consoleVisible });
    this.applyLayout();
  },
  
  /**
   * Toggle fullscreen preview
   */
  toggleFullscreen() {
    const preview = document.getElementById('preview');
    if (!preview) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      preview.requestFullscreen();
    }
    
    events.dispatch('layout:fullscreenToggle', { fullscreen: !!document.fullscreenElement });
  },
  
  /**
   * Restore layout from saved state
   */
  restoreLayout() {
    this.sidebarVisible = get('sidebarVisible') !== false;
    this.previewVisible = get('previewVisible') !== false;
    this.consoleVisible = get('consoleVisible') !== false;
    this.currentLayout = get('currentLayout') || 'split';
    
    this.applyLayout();
  },
  
  /**
   * Get layout state
   * @returns {Object} Layout state
   */
  getState() {
    return {
      sidebarVisible: this.sidebarVisible,
      previewVisible: this.previewVisible,
      consoleVisible: this.consoleVisible,
      currentLayout: this.currentLayout
    };
  },
  
  /**
   * Set layout state
   * @param {Object} state - Layout state to apply
   */
  setState(state) {
    if (state.sidebarVisible !== undefined) this.sidebarVisible = state.sidebarVisible;
    if (state.previewVisible !== undefined) this.previewVisible = state.previewVisible;
    if (state.consoleVisible !== undefined) this.consoleVisible = state.consoleVisible;
    if (state.currentLayout !== undefined) this.currentLayout = state.currentLayout;
    
    this.applyLayout();
  }
};

export default Layout;
