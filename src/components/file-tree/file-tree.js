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
      placeholder.innerHTML = '<span class="name" style="color: var(--text-tertiary);">No files</span>';
      this.container.appendChild(placeholder);
    }
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
    const extension = file.name.split('.').pop();
    let iconClass = 'icon-file';
    let iconTitle = 'File';
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
    }
    
    li.innerHTML = `
      <span class="icon ${iconClass}" title="${iconTitle}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      </span>
      <span class="name">${file.name}</span>
    `;
    
    // Select file on click
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectFile(file.name);
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
  }
};

export default FileTree;
