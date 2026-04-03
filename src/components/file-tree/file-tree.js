/**
 * File Tree Component - Side navigation for project files
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';
import FileSystem from '../../modules/filesystem/filesystem.js';

const FileTree = {
  name: 'filetree',
  currentDirectory: null,
  expandedFolders: new Set(),
  selectedFile: null,
  files: [],
  
  /**
   * Initialize file tree
   */
  async init() {
    console.log('Initializing FileTree component...');
    
    // Get container element
    this.container = document.getElementById('file-tree');
    if (!this.container) {
      console.error('File tree container not found');
      return;
    }
    
    // Load saved state from localStorage
    const savedFolders = localStorage.getItem('fileTreeExpanded');
    if (savedFolders) {
      this.expandedFolders = new Set(JSON.parse(savedFolders));
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Render initial tree
    this.render();
    
    console.log('FileTree component initialized');
  },
  
  // ===================== DRAG & DROP =====================

  /**
   * Setup drag and drop handlers for file uploads
   */
  setupDragDrop() {
    const container = document.getElementById('file-sidebar');
    if (!container) return;

    // Create drag overlay
    this.createDragOverlay();

    // Track drag counter to handle nested elements
    this.dragCounter = 0;

    // Drag enter - show overlay
    container.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dragCounter++;
      if (this.dragCounter === 1) {
        this.showDragOverlay();
      }
    });

    // Drag over - allow drop
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    // Drag leave - hide overlay if leaving container
    container.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter <= 0) {
        this.hideDragOverlay();
        this.dragCounter = 0;
      }
    });

    // Drop - handle files
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      this.hideDragOverlay();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await this.handleFileDrop(files);
      }
    });

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => {
      if (e.target.closest('#file-sidebar')) {
        e.preventDefault();
      }
    });

    document.addEventListener('drop', (e) => {
      if (e.target.closest('#file-sidebar')) {
        e.preventDefault();
      }
    });
  },

  /**
   * Create drag overlay element
   */
  createDragOverlay() {
    const container = document.getElementById('file-sidebar');
    if (!container) return;

    // Check if overlay already exists
    if (document.getElementById('drag-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'drag-overlay';
    overlay.className = 'drag-overlay hidden';
    overlay.innerHTML = `
      <div class="drag-overlay-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>Drop files here</span>
        <small>Images, fonts, and media</small>
      </div>
    `;
    container.appendChild(overlay);
  },

  /**
   * Show drag overlay
   */
  showDragOverlay() {
    const overlay = document.getElementById('drag-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    const container = document.getElementById('file-sidebar');
    if (container) {
      container.classList.add('drag-over');
    }
  },

  /**
   * Hide drag overlay
   */
  hideDragOverlay() {
    const overlay = document.getElementById('drag-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    const container = document.getElementById('file-sidebar');
    if (container) {
      container.classList.remove('drag-over');
    }
  },

  /**
   * Handle file drop
   * @param {FileList} files - Dropped files
   */
  async handleFileDrop(files) {
    if (!this.currentDirectory) {
      this.showNotification('Please select a project first', 'error');
      return;
    }

    // Create upload progress container
    this.createUploadProgressContainer();

    const results = [];
    for (const file of files) {
      const result = await this.uploadFile(file);
      results.push(result);
    }

    // Show summary
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      this.showNotification(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`, 'success');
      // Refresh file tree
      await this.listFiles();
    }

    if (errorCount > 0) {
      const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
      this.showNotification(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}: ${errors}`, 'error');
    }

    // Remove progress container after delay
    setTimeout(() => this.removeUploadProgressContainer(), 3000);
  },

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
      font: ['font/woff', 'font/woff2', 'font/ttf', 'application/x-font-ttf', 'application/x-font-woff'],
      media: ['video/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    };

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File "${file.name}" exceeds 10MB limit`
      };
    }

    // Check file type
    const isImage = allowedTypes.image.includes(file.type);
    const isFont = allowedTypes.font.includes(file.type);
    const isMedia = allowedTypes.media.includes(file.type);

    // Also check by extension for fonts that might not have proper MIME types
    const extension = file.name.split('.').pop().toLowerCase();
    const fontExtensions = ['woff', 'woff2', 'ttf'];
    if (fontExtensions.includes(extension) && !isFont) {
      return { valid: true, type: 'font' };
    }

    if (!isImage && !isFont && !isMedia) {
      return {
        valid: false,
        error: `File "${file.name}" has unsupported type (${file.type || 'unknown'})`
      };
    }

    // Determine folder
    let folder = 'assets/';
    if (isImage || isMedia) folder = 'assets/media/';
    else if (isFont) folder = 'assets/fonts/';

    return { valid: true, type: isImage ? 'image' : isFont ? 'font' : 'media', folder };
  },

  /**
   * Upload a single file
   * @param {File} file - File to upload
   * @returns {Object} Upload result
   */
  async uploadFile(file) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error, file: file.name };
    }

    // Create progress element
    const progressEl = this.createUploadProgressItem(file.name);

    try {
      // Ensure assets folder structure exists
      await FileSystem.createFolder(this.currentDirectory, validation.folder);

      // Create file path
      const filePath = validation.folder + file.name;

      // Write file using FileSystem API
      await FileSystem.writeFileBinary(this.currentDirectory, filePath, file);

      // Update progress
      this.updateUploadProgress(file.name, 100);

      // Generate thumbnail for images
      if (validation.type === 'image') {
        await this.generateAndStoreThumbnail(file, filePath);
      }

      return { success: true, file: file.name, path: filePath };
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      this.updateUploadProgress(file.name, -1); // -1 indicates error
      return { success: false, error: error.message, file: file.name };
    }
  },

  /**
   * Generate thumbnail for image and store it
   * @param {File} file - Image file
   * @param {string} filePath - Path where file will be stored
   */
  async generateAndStoreThumbnail(file, filePath) {
    try {
      const thumbnail = await this.generateThumbnail(file);
      // Store thumbnail in localStorage for persistence
      const thumbnails = JSON.parse(localStorage.getItem('fileTreeThumbnails') || '{}');
      thumbnails[filePath] = thumbnail;
      localStorage.setItem('fileTreeThumbnails', JSON.stringify(thumbnails));
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
    }
  },

  /**
   * Generate thumbnail for image
   * @param {File} file - Image file
   * @returns {Promise<string>} Thumbnail data URL
   */
  generateThumbnail(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Calculate aspect ratio crop
        const scale = Math.max(32 / img.width, 32 / img.height);
        const x = (32 - img.width * scale) / 2;
        const y = (32 - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Create upload progress container
   */
  createUploadProgressContainer() {
    // Remove existing container
    this.removeUploadProgressContainer();

    const container = document.createElement('div');
    container.id = 'upload-progress-container';
    container.className = 'upload-progress-container';

    const header = document.createElement('div');
    header.className = 'upload-progress-header';
    header.innerHTML = '<span>Uploading...</span>';

    const list = document.createElement('div');
    list.id = 'upload-progress-list';
    list.className = 'upload-progress-list';

    container.appendChild(header);
    container.appendChild(list);

    document.body.appendChild(container);
  },

  /**
   * Remove upload progress container
   */
  removeUploadProgressContainer() {
    const container = document.getElementById('upload-progress-container');
    if (container) {
      container.remove();
    }
  },

  /**
   * Create upload progress item
   * @param {string} fileName - Name of file
   * @returns {HTMLElement} Progress element
   */
  createUploadProgressItem(fileName) {
    const list = document.getElementById('upload-progress-list');
    if (!list) return null;

    const item = document.createElement('div');
    item.className = 'upload-progress-item';
    item.dataset.file = fileName;
    item.innerHTML = `
      <span class="upload-file-name">${fileName}</span>
      <div class="upload-progress-bar">
        <div class="upload-progress-fill" style="width: 0%"></div>
      </div>
    `;

    list.appendChild(item);
    return item;
  },

  /**
   * Update upload progress
   * @param {string} fileName - Name of file
   * @param {number} percent - Progress percentage (0-100, or -1 for error)
   */
  updateUploadProgress(fileName, percent) {
    const list = document.getElementById('upload-progress-list');
    if (!list) return;

    const item = list.querySelector(`[data-file="${fileName}"]`);
    if (!item) return;

    const fill = item.querySelector('.upload-progress-fill');
    if (fill) {
      fill.style.width = percent === -1 ? '100%' : `${percent}%`;
      fill.classList.toggle('error', percent === -1);
    }

    if (percent === 100) {
      item.classList.add('complete');
    } else if (percent === -1) {
      item.classList.add('error');
    }
  },

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('filesystem:directory', (event) => {
      this.currentDirectory = event.detail.directory;
      this.listFiles();
    });

    events.on('project:loaded', (event) => {
      const { project } = event.detail;
      this.currentDirectory = project.directory;
      this.listFiles();
    });

    events.on('editor:newFile', () => {
      this.createFile();
    });

    events.on('editor:tabChanged', (event) => {
      const { tab } = event.detail;
      this.selectFile(tab.id);
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.file-tree-item')) {
        events.dispatch('modal:close');
      }
    });

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Close context menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });

    // Setup drag and drop
    this.setupDragDrop();
  },
  
  /**
   * List files in current directory
   */
  async listFiles() {
    if (!this.currentDirectory) {
      this.container.innerHTML = '<li class="file-tree-item">Select a project first</li>';
      return;
    }
    
    try {
      const entries = await FileSystem.listDirectory(this.currentDirectory);
      this.files = entries;
      this.render();
    } catch (error) {
      console.error('Failed to list files:', error);
      this.container.innerHTML = '<li class="file-tree-item">Error loading files</li>';
    }
  },
  
  /**
   * Render the file tree
   */
  render() {
    this.container.innerHTML = '';

    // Group files and folders
    const folders = this.files.filter(f => f.type === 'folder');
    const files = this.files.filter(f => f.type === 'file');

    // Render folders first
    folders.forEach(folder => this.renderFolder(folder));

    // Then files
    files.forEach(file => this.renderFile(file));

    // If empty, show placeholder
    if (folders.length === 0 && files.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'file-tree-item';
      placeholder.setAttribute('role', 'treeitem');
      placeholder.setAttribute('aria-selected', 'false');
      placeholder.innerHTML = '<span class="name" style="color: var(--text-tertiary);">No files</span>';
      this.container.appendChild(placeholder);
    }

    // Add context menu listener to empty space in file tree wrapper
    const wrapper = document.getElementById('file-tree-wrapper');
    if (wrapper && !wrapper.dataset.contextMenuAdded) {
      wrapper.dataset.contextMenuAdded = 'true';
      wrapper.addEventListener('contextmenu', (e) => {
        // Only show if clicking on empty space (not on a file/folder item)
        if (e.target === wrapper || e.target === this.container) {
          this.showContextMenu(e, null, 'empty');
        }
      });
    }

    // Update ARIA selected state
    this.updateARIASelection();
  },

  /**
   * Update ARIA selected state for file tree items
   */
  updateARIASelection() {
    document.querySelectorAll('.file-tree-item').forEach(item => {
      const isSelected = item.classList.contains('active');
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  },
  
  /**
   * Render a folder
   * @param {Object} folder - Folder object
   * @param {number} depth - Nesting depth
   */
  renderFolder(folder, depth = 1) {
    const li = document.createElement('li');
    li.className = 'file-tree-item';
    li.dataset.type = 'folder';
    li.dataset.depth = depth;
    li.dataset.name = folder.name;
    li.dataset.path = folder.name;
    
    const isExpanded = this.expandedFolders.has(folder.name);
    
    li.innerHTML = `
      <span class="icon icon-folder" title="Folder">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <span class="name">${folder.name}</span>
      <span class="chevron" title="Expand">${isExpanded ? '▼' : '▶'}</span>
    `;
    
    // Toggle expand on click
    li.addEventListener('click', (e) => {
      if (!e.target.closest('.chevron')) {
        e.stopPropagation();
        this.toggleFolder(folder.name);
      }
    });
    
    // Double click to open folder
    li.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.toggleFolder(folder.name);
    });
    
    // Context menu on right-click
    li.addEventListener('contextmenu', (e) => {
      this.showContextMenu(e, folder, 'folder');
    });
    
    this.container.appendChild(li);
  },
  
  /**
   * Render a file
   * @param {Object} file - File object
   * @param {number} depth - Nesting depth
   */
  renderFile(file, depth = 1) {
    const li = document.createElement('li');
    li.className = 'file-tree-item';
    li.dataset.type = 'file';
    li.dataset.depth = depth;
    li.dataset.name = file.name;
    li.dataset.path = file.name;

    // Get file extension for icon
    const extension = file.name.split('.').pop().toLowerCase();
    let iconClass = 'icon-file';
    let iconTitle = 'File';
    let iconContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
    `;

    // Check for image files
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    const isImage = imageExtensions.includes(extension);

    // Check for thumbnail
    let thumbnail = null;
    if (isImage) {
      const thumbnails = JSON.parse(localStorage.getItem('fileTreeThumbnails') || '{}');
      thumbnail = thumbnails[file.name] || thumbnails[`assets/media/${file.name}`];
    }

    if (extension === 'html') {
      iconClass = 'icon-html';
      iconTitle = 'HTML File';
    } else if (extension === 'css') {
      iconClass = 'icon-css';
      iconTitle = 'CSS File';
    } else if (extension === 'js') {
      iconClass = 'icon-js';
      iconTitle = 'JavaScript File';
    } else if (extension === 'json') {
      iconClass = 'icon-json';
      iconTitle = 'JSON File';
    } else if (isImage) {
      iconClass = 'icon-image';
      iconTitle = 'Image File';
    }

    // Build icon content - use thumbnail if available
    if (thumbnail) {
      iconContent = `<img src="${thumbnail}" alt="" class="thumbnail">`;
    } else if (isImage) {
      iconContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      `;
    }

    li.innerHTML = `
      <span class="icon ${iconClass}" title="${iconTitle}">
        ${iconContent}
      </span>
      <span class="name">${file.name}</span>
    `;

    // Select file on click
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectFile(file.name);
    });

    // Context menu on right-click
    li.addEventListener('contextmenu', (e) => {
      this.showContextMenu(e, file, 'file');
    });

    this.container.appendChild(li);
  },
  
  /**
   * Toggle folder expansion
   * @param {string} folderName - Folder name
   */
  toggleFolder(folderName) {
    if (this.expandedFolders.has(folderName)) {
      this.expandedFolders.delete(folderName);
    } else {
      this.expandedFolders.add(folderName);
    }
    
    // Save to localStorage
    localStorage.setItem('fileTreeExpanded', JSON.stringify([...this.expandedFolders]));
    
    // Re-render
    this.render();
  },
  
  /**
   * Select a file
   * @param {string} fileName - File name to select
   */
  selectFile(fileName) {
    // Update UI selection
    document.querySelectorAll('.file-tree-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.name === fileName) {
        item.classList.add('active');
      }
    });
    
    this.selectedFile = fileName;
    
    // Load file content
    this.loadFileContent(fileName);
    
    // Dispatch event
    events.dispatch('filetree:fileSelected', { fileName });
  },
  
  /**
   * Load file content from filesystem
   * @param {string} fileName - File name to load
   */
  async loadFileContent(fileName) {
    if (!this.currentDirectory) {
      console.log('No project loaded');
      return;
    }
    
    try {
      const content = await FileSystem.readFile(this.currentDirectory, fileName);
      
      // Determine language based on extension
      const extension = fileName.split('.').pop();
      const language = extension === 'html' ? 'html' : 
                       extension === 'css' ? 'css' : 'javascript';
      
      // Set content in state
      const tabId = fileName;
      events.dispatch('editor:loadFile', { 
        id: tabId, 
        name: fileName, 
        content, 
        language 
      });
      
      // Set active tab
      events.dispatch('editor:tabChanged', { 
        tab: { id: tabId, name: fileName, language, content, dirty: false } 
      });
    } catch (error) {
      console.error(`Failed to load file "${fileName}":`, error);
      events.dispatch('editor:loadError', { fileName, error });
    }
  },
  
  /**
   * Create new file
   */
  async createFile() {
    if (!this.currentDirectory) {
      console.log('No project loaded');
      return;
    }
    
    const fileName = prompt('Enter file name (e.g., newfile.js):');
    if (!fileName) return;
    
    try {
      // Create file with default content
      let content = '';
      let extension = 'txt';
      
      if (fileName.endsWith('.html')) {
        content = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New File</title>\n</head>\n<body>\n  \n</body>\n</html>';
        extension = 'html';
      } else if (fileName.endsWith('.css')) {
        content = '/* Add your styles here */\n';
        extension = 'css';
      } else if (fileName.endsWith('.js')) {
        content = '// Your code here\n';
        extension = 'javascript';
      }
      
      await FileSystem.writeFile(this.currentDirectory, fileName, content, { createIfNotExists: true });
      
      // Add to file list
      this.files.push({ name: fileName, type: 'file' });
      this.render();
      
      // Auto-select new file
      this.selectFile(fileName);
      
      events.dispatch('editor:newFileCreated', { fileName, content });
    } catch (error) {
      console.error('Failed to create file:', error);
      alert(`Failed to create file: ${error.message}`);
    }
  },
  
  /**
   * Rename file
   * @param {string} oldName - Current file name
   * @param {string} newName - New file name
   */
  async renameFile(oldName, newName) {
    if (!this.currentDirectory) {
      console.log('No project loaded');
      return;
    }
    
    try {
      await FileSystem.writeFile(this.currentDirectory, newName, '', { createIfNotExists: true });
      await FileSystem.deleteFile(this.currentDirectory, oldName);
      
      // Refresh file list
      this.listFiles();
      
      // Update selection
      this.selectFile(newName);
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert(`Failed to rename file: ${error.message}`);
    }
  },
  
  /**
   * Delete file
   * @param {string} fileName - File name to delete
   */
  async deleteFile(fileName) {
    if (!this.currentDirectory) {
      console.log('No project loaded');
      return;
    }
    
    if (!confirm(`Delete "${fileName}"?`)) return;
    
    try {
      await FileSystem.deleteFile(this.currentDirectory, fileName);
      
      // Remove from file list
      this.files = this.files.filter(f => f.name !== fileName);
      this.render();
      
      // Clear selection if deleted file was selected
      if (this.selectedFile === fileName) {
        this.selectedFile = null;
        events.dispatch('editor:tabClosed', { tabId: fileName });
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert(`Failed to delete file: ${error.message}`);
    }
  },
  
  /**
   * Get current file
   * @returns {string|null} Current file name
   */
  getCurrentFile() {
    return this.selectedFile;
  },
  
  /**
   * Clear file tree UI
   */
  clear() {
    this.container.innerHTML = '';
  },
  
  // ===================== CONTEXT MENU =====================
  
  /**
   * Show context menu on right-click
   * @param {Event} event - The contextmenu event
   * @param {Object} item - The file or folder item
   * @param {string} type - 'file', 'folder', or 'empty'
   */
  showContextMenu(event, item, type) {
    event.preventDefault();
    event.stopPropagation();
    
    // Hide any existing context menu
    this.hideContextMenu();
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu file-tree-context-menu';
    menu.dataset.type = type;
    
    // Build menu items based on type
    let menuHTML = '';
    
    if (type === 'file') {
      menuHTML = `
        <button class="context-menu-item" data-action="rename">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Rename
        </button>
        <button class="context-menu-item" data-action="delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      `;
    } else if (type === 'folder') {
      menuHTML = `
        <button class="context-menu-item" data-action="new-file">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          New File
        </button>
        <button class="context-menu-item" data-action="new-folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="13" x2="12" y2="19"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
          </svg>
          New Folder
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item" data-action="rename">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Rename
        </button>
        <button class="context-menu-item" data-action="delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      `;
    } else if (type === 'empty') {
      menuHTML = `
        <button class="context-menu-item" data-action="new-file">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          New File
        </button>
        <button class="context-menu-item" data-action="new-folder">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="13" x2="12" y2="19"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
          </svg>
          New Folder
        </button>
      `;
    }
    
    menu.innerHTML = menuHTML;
    
    // Position menu at click coordinates
    const rect = this.container.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    
    // Adjust position if menu would go off-screen
    const menuWidth = 180;
    const menuHeight = type === 'file' ? 80 : type === 'empty' ? 70 : 140;
    
    if (x + menuWidth > rect.width) {
      x = rect.width - menuWidth - 10;
    }
    if (y + menuHeight > rect.height) {
      y = rect.height - menuHeight - 10;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Store current item for action handlers
    menu.dataset.itemName = item ? item.name : '';
    menu.dataset.itemPath = item ? (item.path || item.name) : '';
    menu.dataset.itemType = type;
    
    // Add click handlers
    menu.querySelectorAll('.context-menu-item').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = button.dataset.action;
        this.handleContextMenuAction(action, item, type);
      });
    });
    
    // Add to file tree wrapper
    const wrapper = document.getElementById('file-tree-wrapper');
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(menu);
    }
  },
  
  /**
   * Hide context menu
   */
  hideContextMenu() {
    const existingMenu = document.querySelector('.file-tree-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
  },
  
  /**
   * Handle context menu action
   * @param {string} action - The action to perform
   * @param {Object} item - The file or folder item
   * @param {string} type - 'file', 'folder', or 'empty'
   */
  async handleContextMenuAction(action, item, type) {
    this.hideContextMenu();
    
    if (!this.currentDirectory) {
      console.log('No project loaded');
      return;
    }
    
    switch (action) {
      case 'new-file':
        await this.handleNewFile(item, type);
        break;
      case 'new-folder':
        await this.handleNewFolder(item, type);
        break;
      case 'rename':
        await this.handleRename(item, type);
        break;
      case 'delete':
        await this.handleDelete(item, type);
        break;
    }
  },
  
  /**
   * Handle new file action
   * @param {Object} item - The folder item or null
   * @param {string} type - 'folder' or 'empty'
   */
  async handleNewFile(item, type) {
    const folderPath = (type === 'folder' && item) ? item.name : '';
    
    const fileName = prompt(folderPath ? `Enter file name in ${folderPath}:` : 'Enter file name:');
    if (!fileName) return;
    
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    try {
      // Create file with default content based on extension
      let content = '';
      if (fileName.endsWith('.html')) {
        content = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New File</title>\n</head>\n<body>\n  \n</body>\n</html>';
      } else if (fileName.endsWith('.css')) {
        content = '/* Add your styles here */\n';
      } else if (fileName.endsWith('.js')) {
        content = '// Your code here\n';
      }
      
      await FileSystem.writeFile(this.currentDirectory, fullPath, content, { createIfNotExists: true });
      
      // Refresh file list
      await this.listFiles();
      
      // Open the new file
      this.selectFile(fullPath);
      
      // Dispatch event
      events.dispatch('file:created', { path: fullPath, content });
    } catch (error) {
      console.error('Failed to create file:', error);
      alert(`Failed to create file: ${error.message}`);
    }
  },
  
  /**
   * Handle new folder action
   * @param {Object} item - The folder item or null
   * @param {string} type - 'folder' or 'empty'
   */
  async handleNewFolder(item, type) {
    const parentPath = (type === 'folder' && item) ? item.name : '';
    
    const folderName = prompt(parentPath ? `Enter folder name in ${parentPath}:` : 'Enter folder name:');
    if (!folderName) return;
    
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    
    try {
      await FileSystem.createFolder(this.currentDirectory, fullPath);
      
      // Refresh file list
      await this.listFiles();
      
      // Expand the parent folder if creating in a folder
      if (parentPath) {
        this.expandedFolders.add(parentPath);
        localStorage.setItem('fileTreeExpanded', JSON.stringify([...this.expandedFolders]));
      }
      
      // Dispatch event
      events.dispatch('folder:created', { path: fullPath });
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert(`Failed to create folder: ${error.message}`);
    }
  },
  
  /**
   * Handle rename action
   * @param {Object} item - The file or folder item
   * @param {string} type - 'file' or 'folder'
   */
  async handleRename(item, type) {
    if (!item) return;
    
    const oldName = item.name;
    const newName = prompt(`Rename ${type}:`, oldName);
    if (!newName || newName === oldName) return;
    
    try {
      await FileSystem.rename(this.currentDirectory, oldName, newName);
      
      // Refresh file list
      await this.listFiles();
      
      // If renaming a folder, update expanded folders
      if (type === 'folder') {
        if (this.expandedFolders.has(oldName)) {
          this.expandedFolders.delete(oldName);
          this.expandedFolders.add(newName);
          localStorage.setItem('fileTreeExpanded', JSON.stringify([...this.expandedFolders]));
        }
      }
      
      // If the renamed file was selected, update selection
      if (type === 'file' && this.selectedFile === oldName) {
        this.selectedFile = newName;
        this.selectFile(newName);
      }
      
      // Dispatch event
      events.dispatch('file:renamed', { oldPath: oldName, newPath: newName, type });
    } catch (error) {
      console.error('Failed to rename:', error);
      alert(`Failed to rename: ${error.message}`);
    }
  },
  
  /**
   * Handle delete action
   * @param {Object} item - The file or folder item
   * @param {string} type - 'file' or 'folder'
   */
  async handleDelete(item, type) {
    if (!item) return;
    
    const name = item.name;
    const confirmMessage = type === 'folder' 
      ? `Delete folder "${name}" and all its contents?`
      : `Delete file "${name}"?`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      await FileSystem.delete(this.currentDirectory, name);
      
      // Remove from file list
      this.files = this.files.filter(f => f.name !== name);
      
      // If deleting a folder, remove from expanded folders
      if (type === 'folder') {
        this.expandedFolders.delete(name);
        localStorage.setItem('fileTreeExpanded', JSON.stringify([...this.expandedFolders]));
      }
      
      // If the deleted file was selected, clear selection
      if (type === 'file' && this.selectedFile === name) {
        this.selectedFile = null;
        events.dispatch('editor:tabClosed', { tabId: name });
      }
      
      // Refresh file list
      await this.listFiles();
      
      // Dispatch event
      events.dispatch('file:deleted', { path: name, type });
    } catch (error) {
      console.error('Failed to delete:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  }
};

export default FileTree;
