/**
 * Export Module - Handles project export functionality
 */
import { get } from '../core/state.js';
import { events } from '../core/events.js';

const Export = {
  name: 'export',
  
  /**
   * Initialize export module
   */
  async init() {
    console.log('Initializing Export module...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Export module initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('export:html', () => {
      this.exportHTML();
    });
    
    events.on('export:zip', () => {
      this.exportZIP();
    });
  },
  
  /**
   * Export project as single HTML file
   */
  async exportHTML() {
    try {
      // Get file contents from state
      const html = get('currentFileHTML') || '';
      const css = get('currentFileCSS') || '';
      const js = get('currentFileJS') || '';
      
      // Create embedded HTML
      const embeddedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Code Project</title>
  <style>
${css.replace(/</g, '&lt;')}
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script>
${js.replace(/</g, '&lt;')}
  </script>
</body>
</html>
`.trim();
      
      // Create blob and download
      const blob = new Blob([embeddedHTML], { type: 'text/html' });
      this.downloadFile(blob, 'project.html', 'text/html');
      
      events.dispatch('export:completed', { format: 'html' });
    } catch (error) {
      console.error('Failed to export HTML:', error);
      events.dispatch('export:error', { format: 'html', error });
    }
  },
  
  /**
   * Export project as ZIP archive
   */
  async exportZIP() {
    try {
      // For now, create a JSON format that can be converted later
      // When JSZip is loaded, this will be enhanced
      const projects = get('projects') || [];
      const project = get('currentProject');
      
      const zipData = {
        project: project ? {
          name: project.name,
          createdAt: project.createdAt,
          modified: project.lastModified
        } : null,
        files: {
          html: get('currentFileHTML') || '',
          css: get('currentFileCSS') || '',
          js: get('currentFileJS') || ''
        },
        libraries: get('libraries') || [],
        exportedAt: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(zipData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // For actual ZIP, JSZip would be used:
      // const zip = new JSZip();
      // zip.file('index.html', html);
      // zip.file('style.css', css);
      // zip.file('script.js', js);
      // const content = await zip.generateAsync({ type: 'blob' });
      
      this.downloadFile(blob, 'project-data.json', 'application/json');
      
      events.dispatch('export:completed', { format: 'zip' });
    } catch (error) {
      console.error('Failed to export ZIP:', error);
      events.dispatch('export:error', { format: 'zip', error });
    }
  },
  
  /**
   * Download file
   * @param {Blob} blob - File blob
   * @param {string} filename - Filename
   * @param {string} type - MIME type
   */
  downloadFile(blob, filename, type) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  /**
   * Export all projects as bulk ZIP
   */
  async exportAllProjects() {
    // Future implementation
    console.log('Export all projects - future feature');
  }
};

export default Export;
