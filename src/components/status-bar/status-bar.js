/**
 * Status Bar Component
 * Shows GitHub auth status and other app status
 */
import { get, subscribe } from '../../core/state.js';
import { events } from '../../core/events.js';

const StatusBar = {
  name: 'statusBar',
  element: null,
  
  /**
   * Initialize status bar
   */
  async init() {
    console.log('Initializing StatusBar component...');
    
    this.element = document.getElementById('status-bar');
    
    if (!this.element) {
      // Create status bar if not exists
      this.createStatusBar();
    }
    
    this.setupEventListeners();
    this.updateAuthStatus();
    
    // Subscribe to auth changes
    subscribe('github.authenticated', () => {
      this.updateAuthStatus();
    });
    
    subscribe('github.user', () => {
      this.updateAuthStatus();
    });
    
    console.log('StatusBar component initialized');
  },
  
  /**
   * Create status bar element
   */
  createStatusBar() {
    // Find the app container
    const app = document.getElementById('app');
    if (!app) return;
    
    // Create status bar
    this.element = document.createElement('footer');
    this.element.id = 'status-bar';
    this.element.className = 'status-bar';
    this.element.innerHTML = `
      <div class="status-bar-left">
        <span class="status-item" id="status-message">Ready</span>
      </div>
      <div class="status-bar-right">
        <div class="github-status" id="github-status">
          <!-- GitHub auth status will be rendered here -->
        </div>
      </div>
    `;
    
    // Add styles
    this.addStyles();
    
    // Append to app
    app.appendChild(this.element);
  },
  
  /**
   * Add status bar styles
   */
  addStyles() {
    if (document.getElementById('status-bar-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'status-bar-styles';
    style.textContent = `
      .status-bar {
        height: 24px;
        background-color: var(--bg-secondary);
        border-top: 1px solid var(--border-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        font-size: 11px;
        color: var(--text-secondary);
        flex-shrink: 0;
      }
      
      .status-bar-left,
      .status-bar-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .status-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .github-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .github-status-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        background-color: transparent;
        border: 1px solid var(--border-primary);
        border-radius: 3px;
        color: var(--text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 150ms;
      }
      
      .github-status-btn:hover {
        background-color: var(--bg-active);
        color: var(--text-primary);
        border-color: var(--text-gold);
      }
      
      .github-status-btn svg {
        width: 14px;
        height: 14px;
      }
      
      .github-status-btn.connected {
        border-color: var(--color-success);
        color: var(--color-success);
      }
      
      .github-status-btn.connected:hover {
        background-color: rgba(126, 231, 135, 0.1);
      }
      
      .github-user-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        background-color: rgba(201, 169, 97, 0.1);
        border: 1px solid var(--text-gold);
        border-radius: 3px;
        color: var(--text-gold);
        font-size: 11px;
        cursor: pointer;
        transition: all 150ms;
      }
      
      .github-user-chip:hover {
        background-color: rgba(201, 169, 97, 0.2);
      }
      
      .github-user-chip img {
        width: 14px;
        height: 14px;
        border-radius: 50%;
      }
      
      .github-user-chip svg {
        width: 14px;
        height: 14px;
      }
    `;
    document.head.appendChild(style);
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for auth events
    events.on('github:authenticated', () => {
      this.updateAuthStatus();
    });
    
    events.on('github:logout', () => {
      this.updateAuthStatus();
    });
    
    events.on('github:error', (event) => {
      this.showStatus(event.detail?.message || 'GitHub error', 'error');
    });
    
    // Click handler for GitHub status
    this.element?.addEventListener('click', (e) => {
      const githubBtn = e.target.closest('.github-status-btn, .github-user-chip');
      if (githubBtn) {
        const isAuthenticated = get('github.authenticated');
        if (isAuthenticated) {
          // Show logout confirmation or go to settings
          events.dispatch('open-settings');
        } else {
          events.dispatch('github:authenticate');
        }
      }
    });
  },
  
  /**
   * Update GitHub auth status display
   */
  updateAuthStatus() {
    const statusContainer = document.getElementById('github-status');
    if (!statusContainer) return;
    
    const isAuthenticated = get('github.authenticated') || false;
    const user = get('github.user');
    
    if (isAuthenticated && user) {
      statusContainer.innerHTML = `
        <div class="github-user-chip" title="Click to open settings">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>${user.login}</span>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <button class="github-status-btn" title="Connect to GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>Connect to GitHub</span>
        </button>
      `;
    }
  },
  
  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Message type (info, error, success)
   */
  showStatus(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.className = `status-item ${type}`;
      
      // Clear after 3 seconds
      setTimeout(() => {
        statusMessage.textContent = 'Ready';
        statusMessage.className = 'status-item';
      }, 3000);
    }
  }
};

export default StatusBar;
