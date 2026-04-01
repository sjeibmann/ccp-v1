/**
 * Project module - Handles project CRUD operations
 */
import FileSystem from '../filesystem/filesystem.js';
import { get, set, subscribe } from '../../core/state.js';
import { events } from '../../core/events.js';

const module = {
  name: 'project',
  
  /**
   * Initialize the project module
   */
  async init() {
    console.log('Initializing Project module...');
    
    // Event listeners
    events.on('project:create', async (event) => {
      const { directory, name } = event.detail;
      if (directory) {
        await this.create(directory, name);
      }
    });
    
    events.on('project:load', async (event) => {
      const { directory } = event.detail;
      if (directory) {
        await this.load(directory);
      }
    });
    
    console.log('Project module initialized');
  },

  /**
   * Create a new project
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {string} [name='Untitled Project'] - Project name
   * @returns {Promise<Object>} Project info
   */
  async create(directory, name = 'Untitled Project') {
    try {
      console.log('Creating project:', name);
      
      // Create project structure
      await FileSystem.createProjectStructure(directory);
      
      const project = {
        name,
        directory,
        path: directory.name,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // Save to state
      set('currentProject', project);
      set('currentFile', null);
      
      // Update projects list
      const projects = get('projects') || [];
      const existingProjectIndex = projects.findIndex(p => p.name === name);
      
      if (existingProjectIndex !== -1) {
        projects[existingProjectIndex] = project;
      } else {
        projects.push(project);
      }
      set('projects', projects);
      
      events.dispatch('project:created', { project });
      
      console.log('Project created successfully');
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      events.dispatch('project:error', { error });
      throw error;
    }
  },

  /**
   * Load an existing project
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<Object>} Project info
   */
  async load(directory) {
    try {
      console.log('Loading project from:', directory.name);
      
      // Verify project structure exists
      const hasConfig = await FileSystem.exists(directory, 'config.json');
      
      if (!hasConfig) {
        throw new Error('Not a valid project: config.json not found');
      }
      
      // Load config
      const configContent = await FileSystem.readFile(directory, 'config.json');
      const config = JSON.parse(configContent);
      
      const project = {
        name: config.name || directory.name,
        directory,
        path: directory.name,
        config,
        createdAt: config.created || new Date().toISOString(),
        lastModified: config.modified || new Date().toISOString()
      };
      
      // Save to state
      set('currentProject', project);
      set('currentFile', null);
      
      // Load libraries into state
      if (config.libraries) {
        set('libraries', config.libraries);
      }
      
      // Load settings
      if (config.settings) {
        for (const [key, value] of Object.entries(config.settings)) {
          set(`settings.${key}`, value);
        }
      }
      
      events.dispatch('project:loaded', { project });
      
      console.log('Project loaded successfully');
      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      events.dispatch('project:error', { error });
      throw error;
    }
  },

  /**
   * Read project configuration
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<Object>} Config object
   */
  async readConfig(directory) {
    const content = await FileSystem.readFile(directory, 'config.json');
    return JSON.parse(content);
  },

  /**
   * Save project configuration
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @param {Object} config - Config object
   * @returns {Promise<void>}
   */
  async saveConfig(directory, config) {
    // Update last modified time
    config.modified = new Date().toISOString();
    
    const content = JSON.stringify(config, null, 2);
    await FileSystem.writeFile(directory, 'config.json', content);
    
    events.dispatch('project:config-saved', { config });
  },

  /**
   * Export project as single HTML file
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<Blob>} Exported HTML blob
   */
  async exportSingleFile(directory) {
    // Read all files
    const html = await FileSystem.readFile(directory, 'index.html');
    const css = await FileSystem.readFile(directory, 'style.css');
    const js = await FileSystem.readFile(directory, 'script.js');
    
    // Parse and extract head content from HTML
    const htmlContent = html;
    const cssContent = css;
    const jsContent = js;
    
    // Embed styles and scripts
    const exportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Code Project</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script>
${jsContent}
  </script>
</body>
</html>
`.trim();
    
    return new Blob([exportHTML], { type: 'text/html' });
  },

  /**
   * Export project as ZIP archive
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<Blob>} ZIP blob
   */
  async exportZip(directory) {
    // TODO: Implement ZIP export using JSZip
    // This is a placeholder implementation
    const files = [
      { name: 'index.html', content: await FileSystem.readFile(directory, 'index.html') },
      { name: 'style.css', content: await FileSystem.readFile(directory, 'style.css') },
      { name: 'script.js', content: await FileSystem.readFile(directory, 'script.js') },
      { name: 'config.json', content: await FileSystem.readFile(directory, 'config.json') }
    ];
    
    // Create a simple HTML file that contains all project files as inline
    // In production, use JSZip to create actual ZIP file
    
    const zipContent = JSON.stringify({
      files,
      exportedAt: new Date().toISOString()
    }, null, 2);
    
    return new Blob([zipContent], { type: 'application/json' });
  },

  /**
   * Update project metadata
   * @param {string} name - Project name
   * @param {string} description - Project description
   * @returns {Promise<void>}
   */
  async updateMetadata(name, description) {
    const project = get('currentProject');
    
    if (!project) {
      throw new Error('No project loaded');
    }
    
    const config = project.config || {};
    config.name = name;
    if (description) config.description = description;
    
    await this.saveConfig(project.directory, config);
    set('currentProject', { ...project, name, description });
    
    events.dispatch('project:metadata-updated', { name, description });
  },

  /**
   * Get project files
   * @param {FileSystemDirectoryHandle} directory - Directory handle
   * @returns {Promise<Array>} List of project files
   */
  async getFiles(directory) {
    const entries = await FileSystem.listDirectory(directory);
    
    return entries.filter(entry => entry.type === 'file');
  }
};

export default module;
