/**
 * Git Status Bar Component
 * Shows sync status and provides quick git actions
 */
import { get } from '../../core/state.js';
import { events } from '../../core/events.js';
import { SYNC_STATUS } from '../../modules/git-operations.js';

const GitStatusBar = {
  name: 'gitStatusBar',
  container: null,
  statusIndicator: null,
  statusText: null,
  actionButtons: null,
  currentStatus: SYNC_STATUS.NOT_INITIALIZED,

  /**
   * Initialize git status bar
   */
  async init() {
    console.log('Initializing GitStatusBar component...');

    // Find or create container in the editor header
    this.createContainer();

    // Setup event listeners
    this.setupEventListeners();

    console.log('GitStatusBar component initialized');
  },

  /**
   * Create the status bar container
   */
  createContainer() {
    // Check if already exists
    let container = document.getElementById('git-status-bar');
    if (container) {
      this.container = container;
      return;
    }

    // Find the editor header
    const editorHeader = document.querySelector('.editor-header');
    if (!editorHeader) {
      console.warn('Editor header not found, cannot create git status bar');
      return;
    }

    // Create container
    container = document.createElement('div');
    container.id = 'git-status-bar';
    container.className = 'git-status-bar';

    // Insert before the tabs (we'll add after editor-toolbar)
    const toolbar = editorHeader.querySelector('.editor-toolbar');
    if (toolbar) {
      toolbar.appendChild(container);
    } else {
      editorHeader.appendChild(container);
    }

    this.container = container;
    this.render();
  },

  /**
   * Render the status bar content
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="git-status-indicator" id="git-status-indicator">
        <span class="status-icon">○</span>
        <span class="status-text">Git</span>
      </div>
      <div class="git-actions" id="git-actions" style="display: none;">
        <button class="git-btn" data-action="git-commit" title="Commit (Ctrl+Shift+C)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Commit
        </button>
        <button class="git-btn" data-action="git-push" title="Push (Ctrl+Shift+P)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v16M5 9l7-7 7 7"/>
          </svg>
          Push
        </button>
        <button class="git-btn" data-action="git-pull" title="Pull (Ctrl+Shift+L)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22V6M5 13l7 7 7-7"/>
          </svg>
          Pull
        </button>
      </div>
    `;

    this.statusIndicator = document.getElementById('git-status-indicator');
    this.actionButtons = document.getElementById('git-actions');

    // Add click handler for status indicator
    if (this.statusIndicator) {
      this.statusIndicator.addEventListener('click', () => {
        this.toggleActions();
      });
    }
  },

  /**
   * Toggle action buttons visibility
   */
  toggleActions() {
    if (this.actionButtons) {
      const isVisible = this.actionButtons.style.display !== 'none';
      this.actionButtons.style.display = isVisible ? 'none' : 'flex';
    }
  },

  /**
   * Hide action buttons
   */
  hideActions() {
    if (this.actionButtons) {
      this.actionButtons.style.display = 'none';
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for show commit modal
    events.on('git:showCommitModal', () => {
      this.showCommitModal();
    });

    // Listen for status changes
    events.on('git:statusChanged', (event) => {
      const { status } = event.detail || {};
      if (status) {
        this.updateStatus(status);
      }
    });

    // Listen for authentication changes
    events.on('github:loginSuccess', () => {
      this.updateStatus(SYNC_STATUS.SYNCED);
    });

    events.on('github:logout', () => {
      this.updateStatus(SYNC_STATUS.NOT_INITIALIZED);
    });

    // Close actions when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (this.container && !this.container.contains(e.target)) {
        this.hideActions();
      }
    });

    // Handle git actions
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action^="git-"]');
      if (btn) {
        const action = btn.dataset.action.replace('git-', '');
        if (action === 'commit') {
          this.showCommitModal();
        } else {
          events.dispatch(`git:${action}`);
        }
        this.hideActions();
      }
    });
  },

  /**
   * Update the status indicator
   * @param {string} status - Sync status
   */
  updateStatus(status) {
    this.currentStatus = status;

    if (!this.statusIndicator) return;

    const icon = this.statusIndicator.querySelector('.status-icon');
    const text = this.statusIndicator.querySelector('.status-text');

    // Remove all status classes
    this.statusIndicator.className = 'git-status-indicator';

    switch (status) {
      case SYNC_STATUS.SYNCED:
        this.statusIndicator.classList.add('synced');
        if (icon) icon.textContent = '✓';
        if (text) text.textContent = 'Synced';
        break;

      case SYNC_STATUS.CHANGES_TO_PUSH:
        this.statusIndicator.classList.add('changes');
        if (icon) icon.textContent = '●';
        if (text) text.textContent = 'Changes';
        break;

      case SYNC_STATUS.BEHIND_REMOTE:
        this.statusIndicator.classList.add('behind');
        if (icon) icon.textContent = '↓';
        if (text) text.textContent = 'Pull';
        break;

      case SYNC_STATUS.CONFLICT:
        this.statusIndicator.classList.add('conflict');
        if (icon) icon.textContent = '!';
        if (text) text.textContent = 'Conflict';
        break;

      case SYNC_STATUS.NOT_INITIALIZED:
        this.statusIndicator.classList.add('not-initialized');
        if (icon) icon.textContent = '○';
        if (text) text.textContent = 'Git';
        break;

      case SYNC_STATUS.ERROR:
        this.statusIndicator.classList.add('error');
        if (icon) icon.textContent = '✕';
        if (text) text.textContent = 'Error';
        break;

      default:
        if (icon) icon.textContent = '○';
        if (text) text.textContent = 'Git';
    }
  },

  /**
   * Show commit modal
   */
  showCommitModal() {
    // Check if modal already exists
    let modal = document.getElementById('git-commit-modal');
    if (!modal) {
      modal = this.createCommitModal();
    }

    // Get changed files
    this.updateChangedFilesList();

    // Show modal
    modal.classList.remove('hidden');

    // Focus input
    const input = document.getElementById('commit-message');
    if (input) {
      input.focus();
      input.value = '';
    }
  },

  /**
   * Create commit modal
   */
  createCommitModal() {
    const modal = document.createElement('div');
    modal.id = 'git-commit-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content git-commit-modal">
        <div class="modal-header">
          <h2 class="modal-title">Commit Changes</h2>
          <button class="modal-close" data-action="close-commit-modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="commit-form">
            <div class="form-group">
              <label class="form-label" for="commit-message">Commit Message</label>
              <input type="text" id="commit-message" class="form-input" placeholder="Enter commit message..." autocomplete="off">
            </div>
            <div class="changed-files">
              <label class="form-label">Changed Files</label>
              <ul id="changed-files-list" class="changed-files-list">
                <li class="loading-files">Loading...</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" data-action="close-commit-modal">Cancel</button>
          <button class="btn primary" id="commit-btn" data-action="do-commit">Commit</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup event handlers
    const closeButtons = modal.querySelectorAll('[data-action="close-commit-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });

    const commitBtn = document.getElementById('commit-btn');
    if (commitBtn) {
      commitBtn.addEventListener('click', () => {
        const input = document.getElementById('commit-message');
        const message = input?.value?.trim();
        if (message) {
          events.dispatch('git:commit', { message });
          modal.classList.add('hidden');
        } else {
          input?.classList.add('error');
          setTimeout(() => input?.classList.remove('error'), 1000);
        }
      });
    }

    // Close on escape
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.classList.add('hidden');
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        commitBtn?.click();
      }
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    return modal;
  },

  /**
   * Update the changed files list in the commit modal
   */
  async updateChangedFilesList() {
    const list = document.getElementById('changed-files-list');
    if (!list) return;

    // Get the git operations module
    const app = window.CCP?.app;
    if (!app?.modules?.gitOperations) {
      list.innerHTML = '<li class="no-files">Git operations not available</li>';
      return;
    }

    try {
      const changedFiles = await app.modules.gitOperations.getChangedFiles();

      if (changedFiles.length === 0) {
        list.innerHTML = '<li class="no-files">No changes to commit</li>';
        return;
      }

      list.innerHTML = changedFiles.map(file => {
        const statusIcon = {
          'modified': '~',
          'untracked': '+',
          'deleted': '-',
          'staged': '●'
        }[file.status] || '?';

        const statusClass = `status-${file.status}`;

        return `
          <li class="changed-file ${statusClass}">
            <span class="file-status-icon">${statusIcon}</span>
            <span class="file-path">${this.escapeHtml(file.filepath)}</span>
            <span class="file-status">${file.status}</span>
          </li>
        `;
      }).join('');
    } catch (error) {
      list.innerHTML = `<li class="no-files">Error loading files: ${this.escapeHtml(error.message)}</li>`;
    }
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

export default GitStatusBar;
