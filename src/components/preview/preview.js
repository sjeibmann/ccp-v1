/**
 * Preview Module - Manages the preview iframe
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const Preview = {
  name: 'preview',
  iframe: null,
  iframeWindow: null,
  autoRun: true,
  debounceTimer: null,
  debounceMs: 500,
  libraries: [],
  
  /**
   * Initialize the preview module
   */
  async init() {
    console.log('Initializing Preview module...');
    
    // Get iframe element
    this.iframe = document.getElementById('preview-frame');
    if (!this.iframe) {
      console.error('Preview iframe not found');
      return;
    }
    
    // Get iframe window
    this.iframeWindow = this.iframe.contentWindow;
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load libraries
    this.loadLibraries();
    
    // Show placeholder initially
    this.showPlaceholder(true);
    
    console.log('Preview module initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('editor:run', () => {
      this.runCode();
    });
    
    events.on('editor:codeChange', () => {
      if (this.autoRun) {
        this.queueRun();
      }
    });
    
    events.on('preview:toggleAutoRun', () => {
      this.toggleAutoRun();
    });
    
    events.on('preview:refresh', () => {
      this.refresh();
    });
    
    events.on('preview:popout', () => {
      this.popout();
    });
  },
  
  /**
   * Load libraries into the iframe
   */
  loadLibraries() {
    // Get enabled libraries from state
    this.libraries = get('libraries') || [];
    
    // Load scripts into iframe
    if (this.iframeWindow) {
      const head = this.iframeWindow.document.head;
      
      this.libraries.forEach(lib => {
        if (lib.enabled && lib.url) {
          const script = this.iframeWindow.document.createElement('script');
          script.src = lib.url;
          script.charset = 'utf-8';
          script.onload = () => {
            console.log(`Loaded library: ${lib.name}`);
          };
          script.onerror = () => {
            console.error(`Failed to load library: ${lib.name}`);
          };
          head.appendChild(script);
        }
      });
    }
  },
  
  /**
   * Run the code in the preview
   */
  runCode() {
    // Get code from state
    const html = get('currentFileHTML') || '';
    const css = get('currentFileCSS') || '';
    const js = get('currentFileJS') || '';
    
    // Update placeholder visibility
    this.showPlaceholder(false);
    
    // Update iframe content
    if (this.iframeWindow && this.iframeWindow.document) {
      const doc = this.iframeWindow.document;
      const content = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${css || ''}
          </style>
        </head>
        <body>
          ${html || ''}
          <script>
            ${js || ''}
          </script>
        </body>
        </html>
      `;
      
      doc.open();
      doc.write(content);
      doc.close();
    }
  },
  
  /**
   * Queue a code run with debounce
   */
  queueRun() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.runCode();
      this.debounceTimer = null;
    }, this.debounceMs);
  },
  
  /**
   * Toggle auto-run
   */
  toggleAutoRun() {
    this.autoRun = !this.autoRun;
    set('autoRun', this.autoRun);
    
    if (this.autoRun) {
      // Re-run code if it's already loaded
      this.runCode();
    }
    
    events.dispatch('preview:autoRunToggle', { enabled: this.autoRun });
  },
  
  /**
   * Refresh the preview
   */
  refresh() {
    if (this.iframeWindow) {
      this.iframeWindow.location.reload();
    }
  },
  
  /**
   * Pop out preview to a new window
   */
  popout() {
    const html = get('currentFileHTML') || '';
    const css = get('currentFileCSS') || '';
    const js = get('currentFileJS') || '';
    
    const content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview - Creative Code</title>
        <style>
          ${css || ''}
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${html || ''}
        <script>
          ${js || ''}
        </script>
      </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      
      // Load libraries in the new window
      this.libraries.forEach(lib => {
        if (lib.enabled && lib.url) {
          const script = newWindow.document.createElement('script');
          script.src = lib.url;
          newWindow.document.head.appendChild(script);
        }
      });
    } else {
      console.error('Failed to open popout window');
      events.dispatch('preview:popoutFailed', { reason: 'popup-blocked' });
    }
  },
  
  /**
   * Show or hide placeholder
   * @param {boolean} show - Whether to show placeholder
   */
  showPlaceholder(show) {
    const placeholder = document.getElementById('preview-placeholder');
    if (placeholder) {
      if (show) {
        placeholder.classList.remove('hidden');
      } else {
        placeholder.classList.add('hidden');
      }
    }
  },
  
  /**
   * Set debounce time
   * @param {number} ms - Debounce time in milliseconds
   */
  setDebounceTime(ms) {
    this.debounceMs = ms;
  },
  
  /**
   * Set auto-run enabled
   * @param {boolean} enabled - Whether auto-run is enabled
   */
  setAutoRun(enabled) {
    this.autoRun = enabled;
  },
  
  /**
   * Get iframe content
   * @returns {Document|null} The iframe document
   */
  getDocument() {
    return this.iframeWindow ? this.iframeWindow.document : null;
  },
  
  /**
   * Get iframe window
   * @returns {Window|null} The iframe window
   */
  getWindow() {
    return this.iframeWindow;
  },
  
  /**
   * Error handler for iframe
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('Preview error:', error);
    events.dispatch('preview:error', { error });
  }
};

export default Preview;
