/**
 * Console Panel Component - Output display for logs, warnings, errors
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const ConsolePanel = {
  name: 'console',
  container: null,
  messages: [],
  consoleMode: 'full', // 'full' | 'minimal'
  autoScroll: true,
  currentFilter: 'all', // 'all' | 'log' | 'warn' | 'error' | 'info'
  
  /**
   * Initialize console panel
   */
  async init() {
    console.log('Initializing ConsolePanel component...');
    
    // Get container elements
    this.container = document.getElementById('console-content');
    this.input = document.getElementById('console-input');
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
   * Navigate to a specific line in the editor
   * @param {number} line - Line number
   * @param {number} col - Column number
   */
  navigateToLine(line, col) {
    events.dispatch('console:navigateToLine', { line, col });
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
    
    // Console tab switching
    const consoleTabs = document.querySelectorAll('.console-tab');
    consoleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        console.log('[DEBUG] Console tab clicked:', tab.dataset.console);
        consoleTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        
        const tabName = tab.dataset.console;
        console.log('[DEBUG] Switching to console tab:', tabName);
        
        // Dispatch event for other components
        events.dispatch('console:tabChanged', { tab: tabName });
        
        // Update visible content based on tab
        this.switchConsoleTab(tabName);
      });
    });
    
    console.log('[DEBUG] Console setup complete');
  },
  
  /**
   * Switch console tab view
   * @param {string} tabName - Tab name (console, terminal, output)
   */
  switchConsoleTab(tabName) {
    console.log('[DEBUG] Switching console tab to:', tabName);
    // For now, just log. In future, this would switch between
    // console logs, terminal, and build output views
    this.addMessage('info', `Switched to ${tabName} tab`);
  },
  
  /**
   * Setup filter buttons
   */
  setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.console-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.setFilter(filter);
        
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },
  
  /**
   * Set filter and re-render
   * @param {string} filter - Filter type ('all', 'log', 'warn', 'error', 'info')
   */
  setFilter(filter) {
    this.currentFilter = filter;
    this.reRenderMessages();
  },
  
  /**
   * Re-render all messages based on current filter
   */
  reRenderMessages() {
    // Clear container
    this.container.innerHTML = '';
    
    // Re-render filtered messages
    this.messages.forEach(msg => {
      if (this.shouldShowMessage(msg.type)) {
        this.renderMessageToDOM(msg.type, msg.message, msg.timestamp, msg.stack, msg.line, msg.url);
      }
    });
    
    // Auto scroll to bottom
    if (this.autoScroll) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  },
  
  /**
   * Check if message should be shown based on filter
   * @param {string} type - Message type
   * @returns {boolean} Whether to show the message
   */
  shouldShowMessage(type) {
    if (this.currentFilter === 'all') return true;
    return type === this.currentFilter;
  },
  
  /**
   * Handle messages from iframe
   * @param {MessageEvent} event - Message event from iframe
   */
  handleIframeMessage(event) {
    // Security check - only accept messages from our iframe
    const previewFrame = document.getElementById('preview-frame');
    if (!previewFrame || event.source !== previewFrame.contentWindow) {
      return;
    }
    
    const data = event.data;
    if (!data || !data.type) return;
    
    if (data.type === 'console') {
      // Handle console message
      const message = data.args ? data.args.join(' ') : '';
      this.addEntry(data.level, message, data.timestamp);
    } else if (data.type === 'error') {
      // Handle error message
      const stack = data.stack || '';
      const message = data.message || 'Unknown error';
      this.addEntryWithDetails('error', message, data.timestamp, stack, data.line, data.url);
    }
  },
  
  /**
   * Add entry to console
   * @param {string} type - Entry type
   * @param {string} message - Message content
   * @param {string} timestamp - Timestamp
   */
  addEntry(type, message, timestamp) {
    this.addEntryWithDetails(type, message, timestamp);
  },
  
  /**
   * Add entry with full details
   * @param {string} type - Entry type
   * @param {string} message - Message content
   * @param {string} timestamp - Timestamp
   * @param {string} stack - Stack trace
   * @param {number} line - Line number
   * @param {string} url - URL
   */
  addEntryWithDetails(type, message, timestamp, stack = '', line = 0, url = '') {
    // Filter in minimal mode
    if (this.consoleMode === 'minimal' && type !== 'error') {
      return;
    }
    
    const timestampStr = timestamp || new Date().toISOString();
    
    // Store message
    const msgData = { 
      type, 
      message, 
      timestamp: timestampStr,
      stack,
      line,
      url
    };
    this.messages.push(msgData);
    
    // Only render if passes filter
    if (this.shouldShowMessage(type)) {
      this.renderMessageToDOM(type, message, timestampStr, stack, line, url);
      
      // Auto scroll to bottom
      if (this.autoScroll) {
        this.container.scrollTop = this.container.scrollHeight;
      }
    }
    
    // Dispatch event for state sync
    events.dispatch('console:messageAdded', msgData);
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
    this.addEntryWithDetails(type, message, timestamp);
  },
  
  /**
   * Render message in DOM
   * @param {string} type - Message type
   * @param {string} message - Message content
   * @param {string} timestamp - Message timestamp
   */
  renderMessage(type, message, timestamp) {
    this.renderMessageToDOM(type, message, timestamp);
  },
  
  /**
   * Render message to DOM with full details
   * @param {string} type - Message type
   * @param {string} message - Message content
   * @param {string} timestamp - Message timestamp
   * @param {string} stack - Stack trace
   * @param {number} line - Line number
   * @param {string} url - URL
   */
  renderMessageToDOM(type, message, timestamp, stack = '', line = 0, url = '') {
    const time = this.formatTime(timestamp || new Date().toISOString());
    
    const entry = document.createElement('div');
    entry.className = `console-entry ${type}`;
    
    let locationInfo = '';
    if (line > 0) {
      locationInfo = `at line ${line}`;
      if (url && url !== 'unknown') {
        locationInfo += ` in ${url}`;
      }
    }
    
    let stackHtml = '';
    if (stack) {
      const stackLines = stack.split('\n').filter(l => l.trim());
      stackHtml = stackLines.map((line, index) => {
        // Try to extract file path and line number
        const match = line.match(/at\s+(.+?):(\d+):(\d+)/);
        if (match || line.includes(':')) {
          return `<div class="stack-line" data-index="${index}">${this.escapeHtml(line)}</div>`;
        }
        return `<div class="stack-message">${this.escapeHtml(line)}</div>`;
      }).join('');
      
      if (stackHtml) {
        stackHtml = `<div class="stack-trace">${stackHtml}</div>`;
      }
    }
    
    entry.innerHTML = `
      <div class="console-entry-header">
        <span class="timestamp">${time}</span>
        <span class="type">${type.toUpperCase()}</span>
        <span class="message">${this.escapeHtml(message)}</span>
        ${locationInfo ? `<span class="location">${locationInfo}</span>` : ''}
      </div>
      ${stackHtml}
    `;
    
    // Add click handlers for stack trace lines
    if (stack) {
      const stackLines = entry.querySelectorAll('.stack-line');
      stackLines.forEach((lineEl) => {
        lineEl.addEventListener('click', () => {
          const lineText = lineEl.textContent;
          // Try to navigate to the error location
          this.navigateToStackLine(lineText);
        });
      });
    }
    
    this.container.appendChild(entry);
  },
  
  /**
   * Navigate to a stack line in the editor
   * @param {string} lineText - Stack line text
   */
  navigateToStackLine(lineText) {
    // Extract line and column numbers
    const match = lineText.match(/:(\d+):(\d+)$/);
    if (match) {
      const line = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);
      events.dispatch('console:navigateToLine', { line, col });
    }
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
