/**
 * Conflict Resolution Modal Component
 * Handles Git merge conflict resolution UI
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const ConflictModal = {
  name: 'conflictModal',
  
  conflicts: [],
  currentFile: null,
  resolvedFiles: new Set(),
  
  /**
   * Initialize conflict modal
   */
  async init() {
    console.log('Initializing ConflictModal component...');
    
    this.modal = document.getElementById('conflict-modal');
    this.filesList = document.getElementById('conflict-files-list');
    this.localPane = document.getElementById('conflict-local');
    this.remotePane = document.getElementById('conflict-remote');
    this.mergedPane = document.getElementById('conflict-merged');
    this.currentFileLabel = document.getElementById('conflict-current-file');
    this.progressLabel = document.getElementById('conflict-progress');
    
    if (!this.modal) {
      console.error('Conflict modal not found');
      return;
    }
    
    this.setupEventListeners();
    this.addStyles();
    
    console.log('ConflictModal component initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Show modal when git conflict occurs
    events.on('git:conflict', (event) => {
      const { files, message } = event.detail || {};
      this.show(files || []);
    });
    
    // Update when a conflict is resolved
    events.on('git:conflictResolved', (event) => {
      const { file, resolution } = event.detail || {};
      this.onConflictResolved(file, resolution);
    });
    
    // Close when all conflicts resolved
    events.on('git:allConflictsResolved', () => {
      this.close();
    });
    
    // Action buttons
    events.on('action:accept-local', () => {
      this.resolveCurrent('local');
    });
    
    events.on('action:accept-remote', () => {
      this.resolveCurrent('remote');
    });
    
    events.on('action:manual-merge', () => {
      this.enableManualMerge();
    });
    
    events.on('action:save-merge', () => {
      this.saveManualMerge();
    });
    
    events.on('action:cancel-conflict', () => {
      this.close();
    });
    
    events.on('action:resolve-all', () => {
      this.resolveAll();
    });
    
    // File list click handler
    if (this.filesList) {
      this.filesList.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.conflict-file-item');
        if (fileItem) {
          const filePath = fileItem.dataset.filepath;
          if (filePath) {
            this.selectFile(filePath);
          }
        }
      });
    }
    
    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        // Don't close on backdrop click - force explicit cancel
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.modal.classList.contains('hidden')) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        // Don't close on escape - require explicit action
      }
    });
  },
  
  /**
   * Show the conflict modal
   * @param {Array} conflicts - Array of conflicting file paths
   */
  show(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      console.log('No conflicts to show');
      return;
    }
    
    this.conflicts = conflicts.map(c => typeof c === 'string' ? { path: c } : c);
    this.resolvedFiles.clear();
    this.currentFile = null;
    
    this.renderFileList();
    this.updateProgress();
    
    // Select first unresolved file
    const firstUnresolved = this.conflicts.find(c => !this.resolvedFiles.has(c.path));
    if (firstUnresolved) {
      this.selectFile(firstUnresolved.path);
    }
    
    this.modal.classList.remove('hidden');
    
    events.dispatch('conflictModal:opened', { conflicts: this.conflicts });
  },
  
  /**
   * Close the modal
   */
  close() {
    this.modal.classList.add('hidden');
    this.conflicts = [];
    this.currentFile = null;
    this.resolvedFiles.clear();
    
    events.dispatch('conflictModal:closed');
  },
  
  /**
   * Render the file list sidebar
   */
  renderFileList() {
    if (!this.filesList) return;
    
    this.filesList.innerHTML = this.conflicts.map(conflict => {
      const fileName = conflict.path.split('/').pop();
      const isResolved = this.resolvedFiles.has(conflict.path);
      const isCurrent = this.currentFile === conflict.path;
      
      return `
        <div class="conflict-file-item ${isCurrent ? 'active' : ''} ${isResolved ? 'resolved' : ''}" 
             data-filepath="${conflict.path}">
          <span class="file-icon">
            ${isResolved ? this.getCheckIcon() : this.getFileIcon()}
          </span>
          <span class="file-name" title="${conflict.path}">${fileName}</span>
          ${isResolved ? '<span class="resolved-badge">Resolved</span>' : ''}
        </div>
      `;
    }).join('');
  },
  
  /**
   * Select a file to display
   * @param {string} filePath - Path of file to select
   */
  selectFile(filePath) {
    this.currentFile = filePath;
    const conflict = this.conflicts.find(c => c.path === filePath);
    
    if (!conflict) return;
    
    // Update UI
    this.renderFileList();
    
    // Update file label
    if (this.currentFileLabel) {
      this.currentFileLabel.textContent = filePath;
    }
    
    // Load and display diff
    this.loadFileContent(filePath);
    
    // Hide manual merge mode if visible
    this.hideManualMerge();
  },
  
  /**
   * Load file content for diff display
   * @param {string} filePath - Path to load
   */
  async loadFileContent(filePath) {
    try {
      // Get local and remote content from git module
      const gitOps = window.app?.getModule?.('gitOperations');
      
      let localContent = '';
      let remoteContent = '';
      
      if (gitOps && gitOps.fs) {
        try {
          const fileBuffer = await gitOps.fs.readFile(`${gitOps.dir}/${filePath}`);
          localContent = new TextDecoder().decode(fileBuffer);
        } catch (e) {
          localContent = '// Unable to read local version';
        }
        
        // For demo purposes, show placeholder remote content
        // In production, this would come from git's conflict markers or merge base
        remoteContent = localContent; // Will be replaced with actual remote content
      } else {
        // Fallback for testing
        localContent = this.getSampleLocal(filePath);
        remoteContent = this.getSampleRemote(filePath);
      }
      
      this.renderDiff(localContent, remoteContent);
    } catch (error) {
      console.error('Failed to load file content:', error);
      this.renderDiff('// Error loading content', '// Error loading content');
    }
  },
  
  /**
   * Render the diff view
   * @param {string} local - Local version content
   * @param {string} remote - Remote version content
   */
  renderDiff(local, remote) {
    if (this.localPane) {
      this.localPane.innerHTML = this.formatCode(local, 'local');
    }
    if (this.remotePane) {
      this.remotePane.innerHTML = this.formatCode(remote, 'remote');
    }
  },
  
  /**
   * Format code for display with line numbers and highlighting
   * @param {string} code - Code content
   * @param {string} type - 'local' or 'remote'
   * @returns {string} Formatted HTML
   */
  formatCode(code, type) {
    if (!code) return '';
    
    const lines = code.split('\n');
    const maxLines = Math.min(lines.length, 500); // Limit for performance
    
    let html = '<div class="code-header">' + (type === 'local' ? 'LOCAL' : 'REMOTE') + '</div>';
    html += '<div class="code-content">';
    
    for (let i = 0; i < maxLines; i++) {
      const line = this.escapeHtml(lines[i]);
      const lineNum = i + 1;
      html += `<div class="code-line"><span class="line-number">${lineNum}</span><span class="line-content">${line || '&nbsp;'}</span></div>`;
    }
    
    html += '</div>';
    return html;
  },
  
  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  /**
   * Resolve the current file
   * @param {string} resolution - 'local', 'remote', or 'manual'
   */
  resolveCurrent(resolution) {
    if (!this.currentFile) return;
    
    if (resolution === 'manual') {
      this.enableManualMerge();
      return;
    }
    
    // Dispatch resolution event
    events.dispatch('git:resolveConflict', {
      filePath: this.currentFile,
      resolution: resolution
    });
  },
  
  /**
   * Enable manual merge mode
   */
  enableManualMerge() {
    if (!this.mergedPane || !this.currentFile) return;
    
    // Get current content from panes
    const localContent = this.extractText(this.localPane);
    const remoteContent = this.extractText(this.remotePane);
    
    // Show merged editor
    this.mergedPane.classList.remove('hidden');
    this.mergedPane.innerHTML = `
      <div class="code-header">MERGED (Edit below)</div>
      <textarea class="merge-textarea" id="manual-merge-content" spellcheck="false">${this.escapeHtml(localContent)}</textarea>
      <div class="merge-actions">
        <button class="btn primary" data-action="save-merge">Save Resolution</button>
        <button class="btn" data-action="cancel-merge">Cancel</button>
      </div>
    `;
    
    // Setup cancel handler
    const cancelBtn = this.mergedPane.querySelector('[data-action="cancel-merge"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideManualMerge());
    }
    
    events.dispatch('conflictModal:manualMerge', { file: this.currentFile });
  },
  
  /**
   * Hide manual merge mode
   */
  hideManualMerge() {
    if (this.mergedPane) {
      this.mergedPane.classList.add('hidden');
      this.mergedPane.innerHTML = '';
    }
  },
  
  /**
   * Save manual merge content
   */
  saveManualMerge() {
    const textarea = document.getElementById('manual-merge-content');
    if (!textarea || !this.currentFile) return;
    
    const mergedContent = textarea.value;
    
    // Dispatch with manual resolution and content
    events.dispatch('git:resolveConflict', {
      filePath: this.currentFile,
      resolution: 'manual',
      content: mergedContent
    });
    
    this.hideManualMerge();
  },
  
  /**
   * Handle conflict resolved event
   * @param {string} filePath - Resolved file path
   * @param {string} resolution - Resolution type
   */
  onConflictResolved(filePath, resolution) {
    this.resolvedFiles.add(filePath);
    this.updateProgress();
    this.renderFileList();
    
    // Select next unresolved file
    const nextUnresolved = this.conflicts.find(c => !this.resolvedFiles.has(c.path));
    if (nextUnresolved) {
      this.selectFile(nextUnresolved.path);
    } else {
      // All resolved
      events.dispatch('git:allConflictsResolved');
    }
  },
  
  /**
   * Update progress indicator
   */
  updateProgress() {
    if (!this.progressLabel) return;
    
    const total = this.conflicts.length;
    const resolved = this.resolvedFiles.size;
    
    this.progressLabel.textContent = `${resolved}/${total} resolved`;
    
    // Update header
    const header = document.getElementById('conflict-header-text');
    if (header) {
      header.textContent = `Merge Conflict - ${total - resolved} file${total - resolved !== 1 ? 's' : ''} remaining`;
    }
  },
  
  /**
   * Resolve all conflicts (accept all local)
   */
  resolveAll() {
    if (!confirm('This will accept all LOCAL versions. Continue?')) {
      return;
    }
    
    this.conflicts.forEach(conflict => {
      if (!this.resolvedFiles.has(conflict.path)) {
        events.dispatch('git:resolveConflict', {
          filePath: conflict.path,
          resolution: 'local'
        });
      }
    });
  },
  
  /**
   * Extract text from code pane
   * @param {HTMLElement} pane - Code pane element
   * @returns {string} Extracted text
   */
  extractText(pane) {
    const content = pane.querySelector('.code-content');
    if (!content) return '';
    
    const lines = [];
    content.querySelectorAll('.code-line').forEach(line => {
      const lineContent = line.querySelector('.line-content');
      if (lineContent) {
        lines.push(lineContent.textContent);
      }
    });
    
    return lines.join('\n');
  },
  
  /**
   * Get file icon SVG
   */
  getFileIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
  },
  
  /**
   * Get check icon SVG
   */
  getCheckIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ee787" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  },
  
  /**
   * Sample local content for testing
   */
  getSampleLocal(filePath) {
    const ext = filePath.split('.').pop();
    
    if (ext === 'html') {
      return `<div class="app">
  <header>
    <h1>My App</h1>
    <nav>
      <a href="#home">Home</a>
    </nav>
  </header>
  <main>
    <p>Welcome to the app!</p>
  </main>
</div>`;
    } else if (ext === 'css') {
      return `.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background: #333;
  padding: 1rem;
}`;
    } else {
      return `function init() {
  console.log('Initializing app');
  const app = document.getElementById('app');
  app.innerHTML = '<h1>Hello</h1>';
}`;
    }
  },
  
  /**
   * Sample remote content for testing
   */
  getSampleRemote(filePath) {
    const ext = filePath.split('.').pop();
    
    if (ext === 'html') {
      return `<div class="app" data-v2>
  <header>
    <h1>My App v2</h1>
    <nav>
      <a href="#home">Home</a>
      <a href="#about">About</a>
    </nav>
  </header>
  <main>
    <p>Welcome to version 2!</p>
  </main>
  <footer>
    <p>&copy; 2024</p>
  </footer>
</div>`;
    } else if (ext === 'css') {
      return `.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header {
  background: linear-gradient(135deg, #333, #444);
  padding: 1rem 2rem;
}`;
    } else {
      return `function init() {
  console.log('Initializing app v2');
  const app = document.getElementById('app');
  app.innerHTML = '<h1>Hello World</h1>';
  setupEventListeners();
}`;
    }
  },
  
  /**
   * Add component-specific styles
   */
  addStyles() {
    if (document.getElementById('conflict-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'conflict-modal-styles';
    style.textContent = `
      /* Conflict Modal Styles */
      .conflict-modal {
        max-width: 90vw;
        max-height: 90vh;
        width: 1200px;
        display: flex;
        flex-direction: column;
      }
      
      .conflict-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-primary);
        background: var(--bg-secondary);
      }
      
      .conflict-header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .conflict-progress {
        font-size: 13px;
        color: var(--text-secondary);
        background: var(--bg-primary);
        padding: 4px 12px;
        border-radius: 12px;
      }
      
      .conflict-body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      
      .conflict-sidebar {
        width: 240px;
        border-right: 1px solid var(--border-primary);
        background: var(--bg-primary);
        overflow-y: auto;
      }
      
      .conflict-sidebar-header {
        padding: 12px 16px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--border-primary);
      }
      
      .conflict-files-list {
        padding: 8px;
      }
      
      .conflict-file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
        margin-bottom: 2px;
      }
      
      .conflict-file-item:hover {
        background: var(--bg-active);
      }
      
      .conflict-file-item.active {
        background: var(--bg-accent);
      }
      
      .conflict-file-item.resolved {
        opacity: 0.6;
      }
      
      .conflict-file-item.resolved .file-name {
        text-decoration: line-through;
      }
      
      .conflict-file-item .file-icon {
        flex-shrink: 0;
        color: var(--text-secondary);
      }
      
      .conflict-file-item .file-name {
        flex: 1;
        font-size: 13px;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .conflict-file-item .resolved-badge {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(126, 231, 135, 0.2);
        color: #7ee787;
        border-radius: 3px;
        text-transform: uppercase;
        font-weight: 600;
      }
      
      .conflict-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
      }
      
      .conflict-file-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-primary);
        background: var(--bg-secondary);
      }
      
      .conflict-file-header .current-file {
        font-family: 'JetBrains Mono', 'Consolas', monospace;
        font-size: 13px;
        color: var(--text-gold);
      }
      
      .conflict-diff-viewer {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        background: var(--border-primary);
        overflow: hidden;
      }
      
      .conflict-diff-viewer.has-merged {
        grid-template-columns: 1fr 1fr 1fr;
      }
      
      .diff-pane {
        background: var(--bg-primary);
        overflow: auto;
        display: flex;
        flex-direction: column;
      }
      
      .diff-pane.local {
        border-right: 1px solid var(--border-primary);
      }
      
      .diff-pane.remote {
        border-left: 1px solid var(--border-primary);
      }
      
      .code-header {
        padding: 8px 12px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-primary);
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      
      .diff-pane.local .code-header {
        color: #ff7b72;
      }
      
      .diff-pane.remote .code-header {
        color: #7ee787;
      }
      
      .code-content {
        padding: 8px 0;
        font-family: 'JetBrains Mono', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.6;
      }
      
      .code-line {
        display: flex;
        min-height: 20px;
      }
      
      .code-line:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      
      .line-number {
        width: 40px;
        padding: 0 8px;
        text-align: right;
        color: var(--text-tertiary);
        user-select: none;
        flex-shrink: 0;
      }
      
      .line-content {
        flex: 1;
        padding: 0 12px;
        color: var(--text-primary);
        white-space: pre;
      }
      
      .diff-highlight-removed {
        background: rgba(255, 123, 114, 0.15);
      }
      
      .diff-highlight-added {
        background: rgba(126, 231, 135, 0.15);
      }
      
      .merge-pane {
        background: var(--bg-primary);
        border-left: 1px solid var(--border-primary);
        display: flex;
        flex-direction: column;
      }
      
      .merge-textarea {
        flex: 1;
        width: 100%;
        padding: 12px;
        background: var(--bg-primary);
        border: none;
        color: var(--text-primary);
        font-family: 'JetBrains Mono', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.6;
        resize: none;
        outline: none;
      }
      
      .merge-textarea:focus {
        box-shadow: inset 0 0 0 1px var(--border-accent);
      }
      
      .merge-actions {
        padding: 12px;
        border-top: 1px solid var(--border-primary);
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .conflict-actions {
        display: flex;
        gap: 8px;
        padding: 16px 24px;
        border-top: 1px solid var(--border-primary);
        background: var(--bg-secondary);
        justify-content: space-between;
        align-items: center;
      }
      
      .conflict-actions-left {
        display: flex;
        gap: 8px;
      }
      
      .conflict-actions-right {
        display: flex;
        gap: 8px;
      }
      
      .btn-resolve {
        background: linear-gradient(135deg, #c9a961, #b8944f);
        border: none;
        color: #0d1117;
        font-weight: 600;
      }
      
      .btn-resolve:hover {
        background: linear-gradient(135deg, #d4b76a, #c9a961);
      }
      
      .btn-accept-local {
        background: rgba(255, 123, 114, 0.2);
        border: 1px solid rgba(255, 123, 114, 0.3);
        color: #ff7b72;
      }
      
      .btn-accept-local:hover {
        background: rgba(255, 123, 114, 0.3);
      }
      
      .btn-accept-remote {
        background: rgba(126, 231, 135, 0.2);
        border: 1px solid rgba(126, 231, 135, 0.3);
        color: #7ee787;
      }
      
      .btn-accept-remote:hover {
        background: rgba(126, 231, 135, 0.3);
      }
      
      /* Scrollbar styling */
      .diff-pane::-webkit-scrollbar,
      .conflict-sidebar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      .diff-pane::-webkit-scrollbar-track,
      .conflict-sidebar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .diff-pane::-webkit-scrollbar-thumb,
      .conflict-sidebar::-webkit-scrollbar-thumb {
        background: var(--border-primary);
        border-radius: 4px;
      }
      
      .diff-pane::-webkit-scrollbar-thumb:hover,
      .conflict-sidebar::-webkit-scrollbar-thumb:hover {
        background: var(--border-accent);
      }
    `;
    document.head.appendChild(style);
  }
};

export default ConflictModal;
