/**
 * Library Management Component
 * Manages CDN library integration
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const LibraryManager = {
  name: 'libraryManager',
  libraries: [],
  
  /**
   * Initialize library manager
   */
  async init() {
    console.log('Initializing LibraryManager component...');
    
    // Load libraries from state
    this.libraries = get('libraries') || [];
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('LibraryManager component initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('libraries:update', (event) => {
      const { libraries } = event.detail;
      this.updateLibraries(libraries);
    });
    
    events.on('library:toggle', (event) => {
      const { libraryIndex } = event.detail;
      this.toggleLibrary(libraryIndex);
    });
    
    events.on('library:add', (event) => {
      const { library } = event.detail;
      this.addLibrary(library);
    });
    
    events.on('library:remove', (event) => {
      const { libraryIndex } = event.detail;
      this.removeLibrary(libraryIndex);
    });
  },
  
  /**
   * Update libraries list
   * @param {Array} libraries - New libraries array
   */
  updateLibraries(libraries) {
    this.libraries = libraries;
    set('libraries', libraries);
    
    // Re-render
    events.dispatch('libraries:rendered');
  },
  
  /**
   * Toggle library enabled state
   * @param {number} index - Library index
   */
  toggleLibrary(index) {
    if (index < 0 || index >= this.libraries.length) return;
    
    this.libraries[index].enabled = !this.libraries[index].enabled;
    set('libraries', this.libraries);
    
    events.dispatch('libraries:rendered');
  },
  
  /**
   * Add new library
   * @param {Object} library - Library object
   */
  addLibrary(library) {
    this.libraries.push(library);
    set('libraries', this.libraries);
    
    events.dispatch('libraries:rendered');
  },
  
  /**
   * Remove library
   * @param {number} index - Library index
   */
  removeLibrary(index) {
    if (index < 0 || index >= this.libraries.length) return;
    
    this.libraries.splice(index, 1);
    set('libraries', this.libraries);
    
    events.dispatch('libraries:rendered');
  },
  
  /**
   * Get all libraries
   * @returns {Array} Libraries array
   */
  getLibraries() {
    return this.libraries;
  },
  
  /**
   * Get enabled libraries
   * @returns {Array} Enabled libraries array
   */
  getEnabledLibraries() {
    return this.libraries.filter(lib => lib.enabled);
  },
  
  /**
   * Get CDN library from URL
   * @param {string} url - CDN URL
   * @returns {Object} Library info
   */
  getLibraryInfo(url) {
    const libraryName = this.extractLibraryName(url);
    const version = this.extractVersion(url);
    
    return {
      name: libraryName,
      version: version || 'latest',
      url: url,
      enabled: true
    };
  },
  
  /**
   * Extract library name from URL
   * @param {string} url - CDN URL
   * @returns {string} Library name
   */
  extractLibraryName(url) {
    // Try to extract from CDN URL
    const match = url.match(/\/([^/@]+)(@.+)?\.min\.js/);
    if (match) {
      const name = match[1];
      // Clean up common patterns
      if (name.includes('-')) {
        return name.split('-')[0];
      }
      return name;
    }
    return 'Custom Library';
  },
  
  /**
   * Extract version from URL
   * @param {string} url - CDN URL
   * @returns {string|null} Version string
   */
  extractVersion(url) {
    const match = url.match(/@([^/]+)/);
    return match ? match[1] : null;
  }
};

export default LibraryManager;
