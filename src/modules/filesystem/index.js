/**
 * File system module wrapper
 * Handles setup, initialization, and integration with the app
 */
import FileSystem from './filesystem.js';
import { get, set, subscribe } from '../../core/state.js';
import { events } from '../../core/events.js';

const module = {
  name: 'filesystem',
  state: {
    currentHandle: null,
    currentPath: '',
    isSupported: false,
    hasPermission: false
  },

  /**
   * Initialize the filesystem module
   */
  async init() {
    console.log('Initializing Filesystem module...');
    
    // Check if File System Access API is supported
    this.state.isSupported = FileSystem.isSupported();
    
    if (!this.state.isSupported) {
      console.warn('File System Access API not supported in this browser');
      events.dispatch('filesystem:supported', { supported: false });
      return;
    }
    
    events.dispatch('filesystem:supported', { supported: true });
    
    // Check if we already have permission
    this.state.hasPermission = await FileSystem.requestPermission();
    
    if (this.state.hasPermission) {
      events.dispatch('filesystem:permission', { granted: true });
    } else {
      console.log('File system permission not granted');
    }
    
    // Subscribe to state changes
    subscribe('filesystem:directory', async (directory) => {
      this.state.currentHandle = directory;
      this.state.currentPath = '';
    });
    
    // Subscribe to project events
    events.on('project:load', async (event) => {
      const { directory } = event.detail;
      this.state.currentHandle = directory;
    });
    
    console.log('Filesystem module initialized');
  },

  /**
   * Request file system permission
   * @returns {Promise<boolean>} True if permission granted
   */
  async requestPermission() {
    if (!this.state.isSupported) {
      return false;
    }
    
    this.state.hasPermission = await FileSystem.requestPermission();
    events.dispatch('filesystem:permission', { granted: this.state.hasPermission });
    return this.state.hasPermission;
  },

  /**
   * Pick a directory
   * @returns {Promise<FileSystemDirectoryHandle|null>} Directory handle or null
   */
  async pickDirectory() {
    if (!this.state.isSupported || !this.state.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return null;
    }
    
    const directory = await FileSystem.pickDirectory();
    
    if (directory) {
      this.state.currentHandle = directory;
      this.state.currentPath = '';
      events.dispatch('filesystem:directory', { directory });
    }
    
    return directory;
  },

  /**
   * Read a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File contents
   */
  async readFile(filePath) {
    if (!this.state.currentHandle) {
      throw new Error('No directory selected. Please select a directory first.');
    }
    
    return await FileSystem.readFile(this.state.currentHandle, filePath);
  },

  /**
   * Write to a file
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @param {Object} [options] - Write options
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content, options = {}) {
    if (!this.state.currentHandle) {
      throw new Error('No directory selected. Please select a directory first.');
    }
    
    return await FileSystem.writeFile(this.state.currentHandle, filePath, content, options);
  },

  /**
   * List directory contents
   * @param {string} [subPath] - Optional subpath
   * @returns {Promise<Array>} List of entries
   */
  async listDirectory(subPath = '') {
    if (!this.state.currentHandle) {
      throw new Error('No directory selected. Please select a directory first.');
    }
    
    return await FileSystem.listDirectory(this.state.currentHandle, subPath);
  },

  /**
   * Create new project structure
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<void>}
   */
  async createProjectStructure(directory) {
    this.state.currentHandle = directory;
    return await FileSystem.createProjectStructure(directory);
  },

  /**
   * Get info about a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} File info
   */
  async getFileInfo(filePath) {
    if (!this.state.currentHandle) {
      throw new Error('No directory selected.');
    }
    
    return await FileSystem.getFileInfo(this.state.currentHandle, filePath);
  },

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async fileExists(filePath) {
    if (!this.state.currentHandle) {
      return false;
    }
    
    return await FileSystem.exists(this.state.currentHandle, filePath);
  },

  /**
   * Delete a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    if (!this.state.currentHandle) {
      throw new Error('No directory selected.');
    }
    
    return await FileSystem.deleteFile(this.state.currentHandle, filePath);
  }
};

export default module;
