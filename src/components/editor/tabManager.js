/**
 * Tab management for code editor files
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const TabManager = {
  name: 'tabManager',
  tabs: [],
  activeTab: null,
  
  /**
   * Initialize tab manager
   */
  init() {
    console.log('Initializing TabManager...');
    
    // Load default tabs
    this.tabs = [
      { id: 'index.html', name: 'index.html', language: 'html', content: '', dirty: false },
      { id: 'style.css', name: 'style.css', language: 'css', content: '', dirty: false },
      { id: 'script.js', name: 'script.js', language: 'javascript', content: '', dirty: false }
    ];
    
    this.activeTab = this.tabs[0];
    
    // Update UI
    this.updateTabUI();
    
    console.log('TabManager initialized');
  },
  
  /**
   * Get all tabs
   * @returns {Array} Array of tab objects
   */
  getTabs() {
    return this.tabs;
  },
  
  /**
   * Get active tab
   * @returns {Object|null} Active tab object
   */
  getActiveTab() {
    return this.activeTab;
  },
  
  /**
   * Switch to a different tab
   * @param {string} tabId - ID of the tab to switch to
   */
  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.activeTab = tab;
      events.dispatch('editor:tabChanged', { tab });
      this.updateTabUI();
    }
  },
  
  /**
   * Add a new tab
   * @param {string} id - Tab ID
   * @param {string} name - Tab name
   * @param {string} language - File language
   * @param {string} content - Initial content
   */
  addTab(id, name, language = 'javascript', content = '') {
    const tab = { id, name, language, content, dirty: false };
    this.tabs.push(tab);
    this.activeTab = tab;
    this.updateTabUI();
    events.dispatch('editor:tabAdded', { tab });
  },
  
  /**
   * Close a tab
   * @param {string} tabId - ID of the tab to close
   */
  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      this.tabs.splice(index, 1);
      if (this.activeTab.id === tabId && this.tabs.length > 0) {
        this.activeTab = this.tabs[0];
      }
      this.updateTabUI();
      events.dispatch('editor:tabClosed', { tabId });
    }
  },
  
  /**
   * Mark a tab as dirty (modified)
   * @param {string} tabId - ID of the tab
   * @param {boolean} isDirty - Whether the tab is dirty
   */
  setDirty(tabId, isDirty) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.dirty = isDirty;
      this.updateTabUI();
    }
  },
  
  /**
   * Update tab content
   * @param {string} tabId - ID of the tab
   * @param {string} content - New content
   */
  updateTabContent(tabId, content) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.content = content;
      tab.dirty = true;
    }
  },
  
  /**
   * Update tab UI
   */
  updateTabUI() {
    const tabsContainer = document.querySelector('.tabs');
    if (tabsContainer) {
      // Update tab buttons
      const buttons = tabsContainer.querySelectorAll('.tab');
      buttons.forEach(button => {
        const tabId = button.dataset.tab;
        const isActive = tabId === this.activeTab.id;
        button.classList.toggle('active', isActive);
      });
    }
  },
  
  /**
   * Update active tab in UI
   * @param {string} tabId - ID of the active tab
   */
  setActive(tabId) {
    this.activeTab = this.tabs.find(t => t.id === tabId) || this.tabs[0];
    this.updateTabUI();
  }
};

export default TabManager;
