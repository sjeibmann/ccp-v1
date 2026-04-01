/**
 * Console Panel Component - Output display for logs, warnings, errors
 */
import { get, set } from '../core/state.js';
import { events } from '../core/events.js';

const ConsolePanel = {
  name: 'console',
  container: null,
  messages: [],
  consoleMode: 'full', // 'full' | 'minimal'
  autoScroll: true,
  
  /**
   * Initialize console panel
   */
  async init() {
    console.log('Initializing ConsolePanel component...');
    
    // Get container elements
    this.container = document.getElementById('console-content');
    this.toggleButton = document.getElementById('console-toggle');
    this.clearButton = document.getElementById('clear-console');
    
    if (!this.container) {
      console.error('Console content container not found');
      return;
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load settings from state
    this.consoleMode = get('consoleMode') || 'full';
    
    // Show placeholder message
    this.addMessage('info', 'Creative Code Platform initialized');
    
    // Override console methods
    this.overrideConsole();
    
    console.log('ConsolePanel component initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('editor:run', () => {
      this.addMessage('info', 'Running code...');
    });
    
    events.on('editor:consoleMessage', (event) => {
      const { type, message, timestamp } = event.detail;
      this.addMessage(type, message, timestamp);
    });
    
    events.on('preview:error', (event) => {
      const { error } = event.detail;
      this.addMessage('error', `Runtime error: ${error.message || 'Unknown error'}`);
    });
    
    events.on('editor:runComplete', () => {
      this.addMessage('info', 'Code execution complete');
    });
    
    events.on('console:clear', () => {
      this.clear();
    });
    
    // Toggle console panel
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.togglePanel();
      });
    }
    
    // Clear console
    if (this.clearButton) {
      this.clearButton.addEventListener('click', () => {
        this.clear();
      });
    }
  },
  
  /**
   * Override console methods to capture output
   */
  overrideConsole() {
    // Save original console methods
    const originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
    
    // Override with our version
    console.log = (...args) => {
      this.logToPanel('log', args);
      originalConsole.log(...args);
    };
    
    console.warn = (...args) => {
      this.logToPanel('warn', args);
      originalConsole.warn(...args);
    };
    
    console.error = (...args) => {
      this.logToPanel('error', args);
      originalConsole.error(...args);
    };
    
    // Capture uncaught exceptions
    window.onerror = (message, source, lineno, colno, error) => {
      this.addMessage('error', `Uncaught error: ${message} (${source}:${lineno}:${colno})`);
      return false;
    };
    
    // Capture promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addMessage('error', `Unhandled promise rejection: ${event.reason}`);
    });
  },
  
  /**
   * Log to panel
   * @param {string} type - Log type (log, warn, error)
   * @param {Array} args - Arguments to log
   */
  logToPanel(type, args) {
    // Ignore in minimal mode unless it's an error
    if (this.consoleMode === 'minimal' && type !== 'error') {
      return;
    }
    
    // Convert arguments to string
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');
    
    this.addMessage(type, message);
  },
  
  /**
   * Add message to console
   * @param {string} type - Message type (log, warn, error, info)
   * @param {string} message - Message content
   * @param {string} [timestamp] - Optional timestamp
   */
  addMessage(type, message, timestamp = null) {
    // Filter in minimal mode
    if (this.consoleMode === 'minimal' && type !== 'error') {
      return;
    }
    
    // Store message
    this.messages.push({ type, message, timestamp: timestamp || new Date().toISOString() });
    
    // Add to DOM
    this.renderMessage(type, message, timestamp);
    
    // Auto scroll to bottom
    if (this.autoScroll) {
      this.container.scrollTop = this.container.scrollHeight;
    }
    
    // Dispatch event for state sync
    events.dispatch('console:messageAdded', { type, message });
  },
  
  /**
   * Render message in DOM
   * @param {string} type - Message type
   * @param {string} message - Message content
   * @param {string} timestamp - Message timestamp
   */
  renderMessage(type, message, timestamp) {
    const time = this.formatTime(timestamp || new Date().toISOString());
    
    const entry = document.createElement('div');
    entry.className = `console-entry ${type}`;
    entry.innerHTML = `
      <span class="timestamp">${time}</span>
      <span class="type">${type.toUpperCase()}</span>
      <span class="message">${this.escapeHtml(message)}</span>
    `;
    
    this.container.appendChild(entry);
  },
  
  /**
   * Format timestamp
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time string
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  /**
   * Clear console
   */
  clear() {
    this.container.innerHTML = '';
    this.messages = [];
  },
  
  /**
   * Toggle console panel visibility
   */
  togglePanel() {
    const consolePanel = document.getElementById('console-panel');
    if (consolePanel) {
      consolePanel.classList.toggle('hidden');
    }
  },
  
  /**
   * Get message count
   * @returns {number} Number of messages
   */
  getMessageCount() {
    return this.messages.length;
  },
  
  /**
   * Get all messages
   * @returns {Array} Array of messages
   */
  getMessages() {
    return this.messages;
  },
  
  /**
   * Set console mode
   * @param {string} mode - 'full' or 'minimal'
   */
  setMode(mode) {
    this.consoleMode = mode;
    set('consoleMode', mode);
    
    // Clear console on mode change
    this.clear();
  },
  
  /**
   * Get current mode
   * @returns {string} Current console mode
   */
  getMode() {
    return this.consoleMode;
  }
};

export default ConsolePanel;
