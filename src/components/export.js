/**
 * Export Module - Handles project export functionality
 */
import JSZip from 'jszip';
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
      const project = get('currentProject');
      const html = get('currentFileHTML') || '';
      const css = get('currentFileCSS') || '';
      const js = get('currentFileJS') || '';
      const libraries = get('libraries') || [];

      // Create ZIP structure
      const zip = new JSZip();

      // Generate standalone HTML with embedded CSS and JS
      const standaloneHTML = this.generateStandaloneHTML(html, css, js, libraries);

      // Add files to ZIP
      zip.file('index.html', standaloneHTML);
      zip.file('style.css', css);
      zip.file('script.js', js);

      // Create config.json
      const config = {
        name: project?.name || 'creative-code-project',
        createdAt: project?.createdAt || new Date().toISOString(),
        modified: project?.lastModified || new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        libraries: libraries.filter(lib => lib.enabled).map(lib => ({
          name: lib.name,
          url: lib.url
        }))
      };
      zip.file('config.json', JSON.stringify(config, null, 2));

      // Create assets folder structure
      const assets = zip.folder('assets');
      assets.folder('media');
      assets.folder('fonts');

      // Generate ZIP file
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download the ZIP file
      const projectName = project?.name || 'project';
      this.downloadFile(content, `${projectName}.zip`, 'application/zip');

      events.dispatch('export:completed', { format: 'zip' });
    } catch (error) {
      console.error('Failed to export ZIP:', error);
      events.dispatch('export:error', { format: 'zip', error });
    }
  },

  /**
   * Generate standalone HTML file with embedded CSS, JS, and library CDN links
   * @param {string} html - HTML content
   * @param {string} css - CSS content
   * @param {string} js - JavaScript content
   * @param {Array} libraries - Array of library objects
   * @returns {string} Complete standalone HTML document
   */
  generateStandaloneHTML(html, css, js, libraries) {
    // Build library script tags
    const libraryScripts = (libraries || [])
      .filter(lib => lib.enabled && lib.url)
      .map(lib => `    <script src="${lib.url}" charset="utf-8"></script>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Code Project</title>
  <style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* User CSS */
${css}
  </style>
</head>
<body>
${html}

${libraryScripts}

<script>
// User JavaScript
${js}
</script>
</body>
</html>`;
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
