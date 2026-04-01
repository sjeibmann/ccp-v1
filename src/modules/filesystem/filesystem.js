/**
 * File System Access API wrapper
 * Provides a clean interface for working with local files and folders
 */
class FileSystem {
  /**
   * Check if File System Access API is supported
   * @returns {boolean} Whether the API is supported
   */
  static isSupported() {
    return 'queryLocalFileSystem' in window && 'showDirectoryPicker' in window;
  }

  /**
   * Request permission to access the file system
   * @returns {Promise<boolean>} True if permission granted
   */
  static async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const state = await window.queryLocalFileSystem('readwrite');
      return state === 'granted';
    } catch (error) {
      console.error('Failed to request file system permission:', error);
      return false;
    }
  }

  /**
   * Open a directory picker to select a folder
   * @returns {Promise<FileSystemDirectoryHandle|null>} Directory handle or null if cancelled
   */
  static async pickDirectory() {
    if (!this.isSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const directory = await window.showDirectoryPicker();
      return directory;
    } catch (error) {
      console.log('Directory picker cancelled or error:', error);
      return null;
    }
  }

  /**
   * Read a file from the file system
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path to the file (relative to directory)
   * @returns {Promise<string>} File contents as text
   */
  static async readFile(directory, filePath) {
    try {
      const fileHandle = await directory.getFileHandle(filePath, { create: false });
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      console.error(`Failed to read file "${filePath}":`, error);
      throw error;
    }
  }

  /**
   * Write content to a file
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path to the file (relative to directory)
   * @param {string} content - Content to write
   * @param {Object} [options] - File options
   * @param {boolean} [options.createIfNotExists=true] - Create file if it doesn't exist
   * @returns {Promise<void>}
   */
  static async writeFile(directory, filePath, content, options = {}) {
    try {
      const createIfNotExists = options.createIfNotExists !== false;
      
      let fileHandle;
      if (createIfNotExists) {
        fileHandle = await directory.getFileHandle(filePath, { create: true });
      } else {
        fileHandle = await directory.getFileHandle(filePath, { create: false });
      }

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      console.error(`Failed to write file "${filePath}":`, error);
      throw error;
    }
  }

  /**
   * Create a new file in the directory
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path where to create the file
   * @returns {Promise<FileSystemFileHandle>} Created file handle
   */
  static async createFile(directory, filePath) {
    try {
      const fileHandle = await directory.getFileHandle(filePath, { create: true });
      return fileHandle;
    } catch (error) {
      console.error(`Failed to create file "${filePath}":`, error);
      throw error;
    }
  }

  /**
   * Delete a file from the directory
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path to the file to delete
   * @returns {Promise<void>}
   */
  static async deleteFile(directory, filePath) {
    try {
      await directory.removeEntry(filePath);
    } catch (error) {
      console.error(`Failed to delete file "${filePath}":`, error);
      throw error;
    }
  }

  /**
   * List contents of a directory
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} [subPath] - Optional subpath to list
   * @returns {Promise<Array<{name: string, type: 'file'|'folder'}>>} List of entries
   */
  static async listDirectory(directory, subPath = '') {
    try {
      const entries = [];
      
      // If subpath provided, navigate to it first
      let targetDir = directory;
      if (subPath) {
        const pathParts = subPath.split('/').filter(p => p);
        for (const part of pathParts) {
          targetDir = await targetDir.getDirectoryHandle(part, { create: false });
        }
      }

      for await (const entry of targetDir.values()) {
        entries.push({
          name: entry.name,
          type: entry.kind === 'file' ? 'file' : 'folder',
          handle: entry
        });
      }

      return entries;
    } catch (error) {
      console.error(`Failed to list directory "${subPath}":`, error);
      throw error;
    }
  }

  /**
   * Check if a file or folder exists at the given path
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(directory, filePath) {
    try {
      const parts = filePath.split('/').filter(p => p);
      
      let currentDir = directory;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: false });
      }

      const fileName = parts[parts.length - 1];
      await currentDir.getFileHandle(fileName, { create: false });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a file's metadata
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} File metadata
   */
  static async getFileInfo(directory, filePath) {
    try {
      const fileHandle = await directory.getFileHandle(filePath, { create: false });
      const file = await fileHandle.getFile();
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };
    } catch (error) {
      console.error(`Failed to get file info for "${filePath}":`, error);
      throw error;
    }
  }

  /**
   * Get default project template structure
   * @returns {Object} Default project structure
   */
  static getDefaultProjectStructure() {
    return {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Creative Code</title>\n  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>\n</head>\n<body>\n  <script src="script.js"></script>\n</body>\n</html>',
      'style.css': '/* Add your styles here */\nbody {\n  margin: 0;\n  padding: 0;\n}\n',
      'script.js': '// Creative code goes here\nfunction setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n  background(200);\n  ellipse(200, 200, 100, 100);\n}\n',
      'config.json': JSON.stringify({
        "name": "New Project",
        "version": "1.0.0",
        "libraries": [
          {
            "name": "p5.js",
            "url": "https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js",
            "enabled": true
          }
        ],
        "settings": {
          "autoRun": true,
          "debounceMs": 500,
          "consoleMode": "full"
        }
      }, null, 2)
    };
  }

  /**
   * Create initial project structure in a directory
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<void>}
   */
  static async createProjectStructure(directory) {
    const structure = this.getDefaultProjectStructure();
    
    for (const [filePath, content] of Object.entries(structure)) {
      await this.writeFile(directory, filePath, content);
    }
  }
}

export default FileSystem;
