/**
 * Settings Modal Component
 * Manages user preferences and application settings
 */
import { get, set, subscribe } from '../../../core/state.js';
import { events } from '../../../core/events.js';

const SettingsModal = {
  name: 'settingsModal',
  
  /**
   * Initialize settings modal
   */
  async init() {
    console.log('Initializing SettingsModal component...');
    
    this.modal = document.getElementById('settings-modal');
    this.form = document.getElementById('settings-form');
    
    if (!this.modal) {
      console.error('Settings modal not found');
      return;
    }
    
    this.setupEventListeners();
    this.loadSettings();
    this.setupGitHubSection();
    
    // Subscribe to auth changes
    subscribe('github.authenticated', () => {
      this.updateGitHubSection();
    });
    
    subscribe('github.user', () => {
      this.updateGitHubSection();
    });
    
    console.log('SettingsModal component initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open settings
    events.on('open-settings', () => {
      this.open();
    });
    
    // Close settings
    events.on('settings:close', () => {
      this.close();
    });
    
    // Save settings
    events.on('settings:save', () => {
      this.saveSettings();
    });
    
    // Close modal on X button click
    const closeButtons = this.modal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.close();
      });
    });
    
    // Save on form submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        events.dispatch('settings:save');
      });
    }
    
    // Listen for GitHub auth events
    events.on('github:authenticated', () => {
      this.updateGitHubSection();
    });
    
    events.on('github:logout', () => {
      this.updateGitHubSection();
    });
  },
  
  /**
   * Setup GitHub section in settings
   */
  setupGitHubSection() {
    // Find or create GitHub section
    let githubSection = this.modal.querySelector('.github-settings');
    
    if (!githubSection && this.form) {
      // Create GitHub section
      githubSection = document.createElement('div');
      githubSection.className = 'github-settings';
      githubSection.innerHTML = `
        <h3 class="settings-section-title">GitHub Integration</h3>
        <div class="github-auth-status" id="github-auth-status">
          <!-- Content will be dynamically updated -->
        </div>
      `;
      
      // Add GitHub client ID input
      const clientIdGroup = document.createElement('div');
      clientIdGroup.className = 'form-group';
      clientIdGroup.innerHTML = `
        <label class="form-label" for="github-client-id">GitHub OAuth Client ID</label>
        <input type="text" id="github-client-id" class="form-input" placeholder="Enter your GitHub OAuth Client ID">
        <p class="form-help">Required for GitHub integration. <a href="https://github.com/settings/developers" target="_blank">Create OAuth App</a></p>
      `;
      
      githubSection.appendChild(clientIdGroup);
      this.form.appendChild(githubSection);
      
      // Add CSS for GitHub section
      this.addGitHubStyles();
    }
    
    this.updateGitHubSection();
  },
  
  /**
   * Add GitHub-specific styles
   */
  addGitHubStyles() {
    if (document.getElementById('github-settings-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'github-settings-styles';
    style.textContent = `
      .settings-section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 24px 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-primary);
      }
      
      .github-auth-status {
        background-color: var(--bg-primary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .github-auth-status.authenticated {
        border-color: var(--color-success);
        background-color: rgba(126, 231, 135, 0.1);
      }
      
      .github-auth-status.not-authenticated {
        border-color: var(--border-primary);
      }
      
      .github-user-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .github-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid var(--border-accent);
      }
      
      .github-user-details {
        flex: 1;
      }
      
      .github-username {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 16px;
      }
      
      .github-login {
        color: var(--text-secondary);
        font-size: 13px;
      }
      
      .github-not-connected {
        text-align: center;
        padding: 16px;
      }
      
      .github-not-connected p {
        color: var(--text-secondary);
        margin-bottom: 12px;
      }
      
      .btn-github {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background-color: #238636;
        border: 1px solid #238636;
        border-radius: var(--radius-md);
        color: white;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      }
      
      .btn-github:hover {
        background-color: #2ea043;
        border-color: #2ea043;
      }
      
      .btn-github svg {
        width: 16px;
        height: 16px;
      }
      
      .btn-github-disconnect {
        background-color: transparent;
        border-color: var(--border-primary);
        color: var(--text-secondary);
        margin-top: 12px;
      }
      
      .btn-github-disconnect:hover {
        background-color: var(--color-error);
        border-color: var(--color-error);
        color: white;
      }
      
      .form-help {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
      
      .form-help a {
        color: var(--text-gold);
        text-decoration: none;
      }
      
      .form-help a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  },
  
  /**
   * Update GitHub section based on auth state
   */
  updateGitHubSection() {
    const statusContainer = document.getElementById('github-auth-status');
    if (!statusContainer) return;
    
    const isAuthenticated = get('github.authenticated') || false;
    const user = get('github.user');
    const clientId = get('github.clientId') || '';
    
    // Update client ID input if exists
    const clientIdInput = document.getElementById('github-client-id');
    if (clientIdInput && clientId) {
      clientIdInput.value = clientId === 'YOUR_GITHUB_CLIENT_ID' ? '' : clientId;
    }
    
    if (isAuthenticated && user) {
      statusContainer.className = 'github-auth-status authenticated';
      statusContainer.innerHTML = `
        <div class="github-user-info">
          <img class="github-avatar" src="${user.avatar_url || ''}" alt="${user.login}" onerror="this.style.display='none'">
          <div class="github-user-details">
            <div class="github-username">${user.name || user.login}</div>
            <div class="github-login">@${user.login}</div>
          </div>
        </div>
        <button class="btn btn-github-disconnect" id="github-disconnect-btn">
          Disconnect from GitHub
        </button>
      `;
      
      // Add disconnect handler
      const disconnectBtn = document.getElementById('github-disconnect-btn');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
          events.dispatch('github:logout');
        });
      }
    } else {
      statusContainer.className = 'github-auth-status not-authenticated';
      statusContainer.innerHTML = `
        <div class="github-not-connected">
          <p>Connect your GitHub account to sync projects and access repositories.</p>
          <button class="btn-github" id="github-connect-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Connect to GitHub
          </button>
        </div>
      `;
      
      // Add connect handler
      const connectBtn = document.getElementById('github-connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', () => {
          // Save client ID first if entered
          const clientIdInput = document.getElementById('github-client-id');
          if (clientIdInput && clientIdInput.value.trim()) {
            set('github.clientId', clientIdInput.value.trim());
          }
          events.dispatch('github:authenticate');
        });
      }
    }
  },
  
  /**
   * Load current settings from state
   */
  loadSettings() {
    if (!this.form) return;
    
    // Load settings values from state
    const settings = get('settings') || {};
    const autoRun = settings.autoRun !== false;
    const debounceMs = settings.debounceMs || 500;
    const consoleMode = settings.consoleMode || 'full';
    const theme = settings.theme || 'neon';
    const githubClientId = get('github.clientId') || '';
    
    // Set form values
    if (this.form.querySelector('#auto-run')) {
      this.form.querySelector('#auto-run').checked = autoRun;
    }
    
    if (this.form.querySelector('#debounce-time')) {
      this.form.querySelector('#debounce-time').value = debounceMs;
    }
    
    if (this.form.querySelector('#console-mode')) {
      this.form.querySelector('#console-mode').value = consoleMode;
    }
    
    if (this.form.querySelector('#theme')) {
      this.form.querySelector('#theme').value = theme;
    }
    
    if (this.form.querySelector('#github-client-id')) {
      this.form.querySelector('#github-client-id').value = 
        githubClientId === 'YOUR_GITHUB_CLIENT_ID' ? '' : githubClientId;
    }
  },
  
  /**
   * Open settings modal
   */
  open() {
    this.modal.classList.remove('hidden');
    this.loadSettings();
    this.updateGitHubSection();
  },
  
  /**
   * Close settings modal
   */
  close() {
    this.modal.classList.add('hidden');
  },
  
  /**
   * Save settings from form
   */
  saveSettings() {
    if (!this.form) return;
    
    const autoRun = this.form.querySelector('#auto-run')?.checked;
    const debounceMs = parseInt(this.form.querySelector('#debounce-time')?.value) || 500;
    const consoleMode = this.form.querySelector('#console-mode')?.value || 'full';
    const theme = this.form.querySelector('#theme')?.value || 'neon';
    const githubClientId = this.form.querySelector('#github-client-id')?.value?.trim();
    
    // Save settings to state
    set('settings', {
      autoRun,
      debounceMs,
      consoleMode,
      theme
    });
    
    // Save GitHub client ID
    if (githubClientId) {
      set('github.clientId', githubClientId);
    }
    
    // Update preview debounce time
    events.dispatch('preview:setDebounceTime', { time: debounceMs });
    
    // Update console mode
    events.dispatch('console:setMode', { mode: consoleMode });
    
    // Close modal
    this.close();
    
    events.dispatch('settings:saved', { 
      autoRun, 
      debounceMs, 
      consoleMode, 
      theme,
      githubClientId: githubClientId ? 'configured' : null
    });
  },
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    console.log('Settings saved:', message);
  }
};

export default SettingsModal;
