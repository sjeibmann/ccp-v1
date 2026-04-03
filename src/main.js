/**
 * Creative Code Platform - Main Entry Point
 * Initialises the application with all modules
 */
import { app } from './core/app.js';
import { events } from './core/events.js';
import { router } from './core/router.js';
import { get, set } from './core/state.js';
import filesystem from './modules/filesystem/index.js';
import project from './modules/project/index.js';
import Editor from './components/editor/editor.js';
import TabManager from './components/editor/tabManager.js';
import Preview from './components/preview/preview.js';
import Layout from './components/layout/layout.js';
import FileTree from './components/file-tree/file-tree.js';
import ConsolePanel from './components/console/console.js';
import CommandPalette from './components/command-palette/command-palette.js';
import SettingsModal from './components/modals/settings/settings.js';
import LibraryManager from './components/modals/library-manager.js';
import ConflictModal from './components/modals/conflict-modal.js';
import Export from './components/export.js';
import StatusBar from './components/status-bar/status-bar.js';
import GitStatusBar from './components/git-status-bar/git-status-bar.js';
import GitHubOAuth from './modules/github.js';
import GitOperations from './modules/git-operations.js';

// Register modules
const modules = [
  filesystem,
  project,
  Editor,
  TabManager,
  Preview,
  Layout,
  FileTree,
  ConsolePanel,
  CommandPalette,
  SettingsModal,
  LibraryManager,
  ConflictModal,
  Export,
  StatusBar,
  GitStatusBar
];

// Register modules with debug logging
console.log('[DEBUG] Registering modules...');
modules.forEach(module => {
  console.log(`[DEBUG] Registering module: ${module.name}`);
  app.registerModule(module.name, module);
});

// Initialize GitHub OAuth (separate module - singleton object)
const githubOAuth = GitHubOAuth;
app.registerModule('githubOAuth', githubOAuth);

// Initialize Git Operations (requires GitHub OAuth)
// Note: GitOperations is an object, not a class - don't use 'new'
GitOperations.init(githubOAuth);
app.registerModule('gitOperations', GitOperations);

// Track keyboard navigation mode
let isKeyboardNav = false;

// Setup event handlers
function setupEventHandlers() {
  // Track keyboard navigation for focus indicators
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isKeyboardNav = true;
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    isKeyboardNav = false;
    document.body.classList.remove('keyboard-nav');
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + R to refresh
    if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
      e.preventDefault();
      events.dispatch('preview:refresh');
    }

    // Cmd/Ctrl + Enter to run
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      events.dispatch('editor:run');
    }

    // Cmd/Ctrl + P for command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault();
      openCommandPalette();
    }

    // Cmd/Ctrl + N for new file
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      events.dispatch('editor:newFile');
    }

    // Cmd/Ctrl + Shift + P for toggle preview visibility
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      events.dispatch('layout:toggle-preview');
    }

    // Cmd/Ctrl + B for toggle file tree visibility
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      events.dispatch('layout:toggle-sidebar');
    }

    // Cmd/Ctrl + Shift + C for git commit
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      events.dispatch('git:showCommitModal');
    }

    // Cmd/Ctrl + Shift + P for git push
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      events.dispatch('git:push');
    }

    // Cmd/Ctrl + Shift + L for git pull
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      events.dispatch('git:pull');
    }

    // Escape to close modals
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModals();
    }

    // Trap focus in modals
    if (e.key === 'Tab') {
      trapFocusInModal(e);
    }
  });

  // Setup focus trap for modals
  setupModalFocusTrap();
  
  // Click handlers for buttons with data-action
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button) {
      const action = button.dataset.action;
      console.log('[DEBUG] Button clicked:', action, 'Element:', button);
      events.dispatch(`action:${action}`, { element: button, event: e });
      console.log('[DEBUG] Event dispatched: action:', action);
    } else {
      // Debug: log all clicks to see if buttons are being detected
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        console.log('[DEBUG] Clicked button without data-action:', e.target);
      }
    }
  });
  
  // File System Access permission on first user interaction
  document.addEventListener('click', async () => {
    if (typeof window.queryLocalFileSystem !== 'undefined') {
      try {
        await window.queryLocalFileSystem('readwrite');
        filesystem.state.hasPermission = true;
      } catch (error) {
        console.log('File System Access API permission handled:', error);
      }
    }
  }, { once: true });
  
  // Editor content change handler (for auto-run)
  events.on('editor:tabContentChange', () => {
    events.dispatch('editor:codeChange');
  });
  
  // Setup action button handlers
  setupActionHandlers();
}

/**
 * Setup handlers for action buttons
 */
function setupActionHandlers() {
  console.log('[DEBUG] Setting up action handlers...');
  
  // Console actions
  events.on('action:clear-console', () => {
    console.log('[DEBUG] Clear console action triggered');
    events.dispatch('console:clear');
  });
  
  events.on('action:toggle-console-filter', () => {
    console.log('[DEBUG] Toggle console filter action triggered');
    events.dispatch('console:toggleFilter');
  });
  
  events.on('action:minimize-console', () => {
    console.log('[DEBUG] Minimize console action triggered');
    events.dispatch('layout:toggle-console');
  });
  
  events.on('action:close-console', () => {
    console.log('[DEBUG] Close console action triggered');
    events.dispatch('layout:toggle-console');
  });
  
  // Sidebar icon actions
  events.on('action:files', () => {
    console.log('[DEBUG] Files action triggered');
    events.dispatch('layout:toggle-sidebar');
  });
  
  events.on('action:search', () => {
    console.log('[DEBUG] Search action triggered');
    events.dispatch('search:open');
  });
  
  events.on('action:git', () => {
    console.log('[DEBUG] Git action triggered');
    events.dispatch('git:openPanel');
  });
  
  events.on('action:extensions', () => {
    console.log('[DEBUG] Extensions action triggered');
    events.dispatch('extensions:open');
  });
  
  events.on('action:settings', () => {
    console.log('[DEBUG] Settings action triggered');
    events.dispatch('modal:open', { modalId: 'settings-modal' });
  });
  
  events.on('action:user', () => {
    console.log('[DEBUG] User action triggered');
    events.dispatch('user:openPanel');
  });
  
  // Modal actions
  events.on('action:close-modal', () => {
    console.log('[DEBUG] Close modal action triggered');
    closeModals();
  });
  
  events.on('action:save-settings', () => {
    console.log('[DEBUG] Save settings action triggered');
    events.dispatch('settings:save');
    closeModals();
  });
  
  // Layout actions
  events.on('action:toggle-sidebar', () => {
    console.log('[DEBUG] Toggle sidebar action triggered');
    events.dispatch('layout:toggle-sidebar');
  });
  
  events.on('action:toggle-file-tree', () => {
    console.log('[DEBUG] Toggle file tree action triggered');
    events.dispatch('layout:toggle-sidebar');
  });
  
  events.on('action:toggle-preview', () => {
    console.log('[DEBUG] Toggle preview action triggered');
    events.dispatch('layout:toggle-preview');
  });
  
  // Editor actions
  events.on('action:run', () => {
    console.log('[DEBUG] Run action triggered');
    events.dispatch('editor:run');
  });
  
  events.on('action:save', () => {
    console.log('[DEBUG] Save action triggered');
    events.dispatch('editor:save');
  });
  
  // File tree actions
  events.on('action:new-file', () => {
    console.log('[DEBUG] New file action triggered');
    events.dispatch('editor:newFile');
  });
  
  events.on('action:open-project', () => {
    console.log('[DEBUG] Open project action triggered');
    events.dispatch('project:open');
  });
  
  // Conflict resolution actions
  events.on('action:accept-local', () => {
    console.log('[DEBUG] Accept local action triggered');
    events.dispatch('git:conflictResolved', { resolution: 'local' });
  });
  
  events.on('action:accept-remote', () => {
    console.log('[DEBUG] Accept remote action triggered');
    events.dispatch('git:conflictResolved', { resolution: 'remote' });
  });
  
  events.on('action:manual-merge', () => {
    console.log('[DEBUG] Manual merge action triggered');
    events.dispatch('git:conflictResolved', { resolution: 'manual' });
  });
  
  events.on('action:cancel-conflict', () => {
    console.log('[DEBUG] Cancel conflict action triggered');
    closeModals();
  });
  
  // Preview toolbar actions
  events.on('action:refresh-preview', () => {
    console.log('[DEBUG] Refresh preview action triggered');
    events.dispatch('preview:refresh');
  });
  
  events.on('action:popout-preview', () => {
    console.log('[DEBUG] Popout preview action triggered');
    events.dispatch('preview:popout');
  });
  
  events.on('action:fullscreen-preview', () => {
    console.log('[DEBUG] Fullscreen preview action triggered');
    events.dispatch('preview:fullscreen');
  });
  
  console.log('[DEBUG] Action handlers setup complete');
}

/**
 * Open command palette
 */
function openCommandPalette() {
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('palette-input');
  
  if (palette) {
    palette.classList.remove('hidden');
    input.value = '';
    input.focus();
    events.dispatch('commandPalette:open');
  }
}

/**
 * Close all modals
 */
function closeModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  });
  const palette = document.getElementById('command-palette');
  if (palette) {
    palette.classList.add('hidden');
    palette.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Setup focus trap for modals
 */
function setupModalFocusTrap() {
  // Listen for modal open events
  events.on('modal:open', (event) => {
    const modalId = event.detail?.modalId;
    if (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        // Focus first focusable element
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }
  });

  // Close modals on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModals();
    }
  });
}

/**
 * Trap focus within open modal
 * @param {KeyboardEvent} e - Keyboard event
 */
function trapFocusInModal(e) {
  const openModal = document.querySelector('.modal:not(.hidden)');
  if (!openModal) return;

  const focusableElements = openModal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      lastFocusable.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === lastFocusable) {
      firstFocusable.focus();
      e.preventDefault();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ready, starting Creative Code Platform...');
  
  // Setup event handlers
  setupEventHandlers();
  
  // Initialize router
  router.parse(window.location.hash.replace('#', ''));
  
  // Start the app
  await app.start();
  
  // Create default project after app initialization
  console.log('[DEBUG] Creating default project...');
  await createDefaultProject();
  
  console.log('Creative Code Platform ready');
});

/**
 * Create default project with sample files
 */
async function createDefaultProject() {
  console.log('[DEBUG] Starting default project creation...');
  
  // Create sample content
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Creative Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="canvas-container"></div>
  <script src="script.js"><\/script>
</body>
</html>`;

  const cssContent = `/* Creative Code Project Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

#canvas-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  display: block;
}`;

  const jsContent = `// Creative Code Project
console.log('Project loaded!');

// Example: Simple animation with p5.js
function setup() {
  createCanvas(400, 400);
  background(13, 17, 23); // BRT CODE dark navy
}

function draw() {
  // Draw a pulsing circle
  const pulse = sin(frameCount * 0.05) * 50 + 100;
  
  background(13, 17, 23, 20); // Fade effect
  
  noStroke();
  fill(201, 169, 97); // BRT CODE gold
  ellipse(width / 2, height / 2, pulse, pulse);
  
  // Draw border
  noFill();
  stroke(201, 169, 97);
  strokeWeight(2);
  rect(10, 10, width - 20, height - 20);
}

// Handle window resize
function windowResized() {
  resizeCanvas(400, 400);
}`;

    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      console.warn('[DEBUG] File System Access API not supported - loading demo content');
      // Load content directly into editor
      set('currentFileHTML', htmlContent);
      set('currentFileCSS', cssContent);
      set('currentFileJS', jsContent);
      set('currentFile', 'index.html');
      events.dispatch('editor:fileLoaded', { 
        fileName: 'index.html', 
        content: htmlContent,
        language: 'html'
      });
      events.dispatch('editor:fileLoaded', { 
        fileName: 'style.css', 
        content: cssContent,
        language: 'css'
      });
      events.dispatch('editor:fileLoaded', { 
        fileName: 'script.js', 
        content: jsContent,
        language: 'javascript'
      });
      // Also dispatch project:loaded for file tree
      events.dispatch('project:loaded', { 
        demo: true,
        project: {
          directory: null,
          files: ['index.html', 'style.css', 'script.js']
        }
      });
      
      // Sync demo content to TabManager
      const TabManager = app.getModule('tabManager');
      if (TabManager && TabManager.tabs) {
        TabManager.tabs.forEach(tab => {
          if (tab.id === 'index.html') tab.content = htmlContent;
          if (tab.id === 'style.css') tab.content = cssContent;
          if (tab.id === 'script.js') tab.content = jsContent;
        });
      }
      
      console.log('[DEBUG] Demo content loaded into editor');
      return;
    }
  
  try {
    // Request a directory for the default project
    console.log('[DEBUG] Requesting directory picker...');
    const directoryHandle = await window.showDirectoryPicker();
    console.log('[DEBUG] Directory selected:', directoryHandle.name);
    
    // Create default files
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Creative Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="canvas-container"></div>
  <script src="script.js"><\/script>
</body>
</html>`;

    const cssContent = `/* Creative Code Project Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

#canvas-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  display: block;
}`;

    const jsContent = `// Creative Code Project
console.log('Project loaded!');

// Example: Simple animation with p5.js
function setup() {
  createCanvas(400, 400);
  background(13, 17, 23); // BRT CODE dark navy
}

function draw() {
  // Draw a pulsing circle
  const pulse = sin(frameCount * 0.05) * 50 + 100;
  
  background(13, 17, 23, 20); // Fade effect
  
  noStroke();
  fill(201, 169, 97); // BRT CODE gold
  ellipse(width / 2, height / 2, pulse, pulse);
  
  // Draw border
  noFill();
  stroke(201, 169, 97);
  strokeWeight(2);
  rect(10, 10, width - 20, height - 20);
}

// Handle window resize
function windowResized() {
  resizeCanvas(400, 400);
}`;

    console.log('[DEBUG] Creating files...');
    
    // Create HTML file
    const htmlFileHandle = await directoryHandle.getFileHandle('index.html', { create: true });
    const htmlWritable = await htmlFileHandle.createWritable();
    await htmlWritable.write(htmlContent);
    await htmlWritable.close();
    console.log('[DEBUG] Created index.html');
    
    // Create CSS file
    const cssFileHandle = await directoryHandle.getFileHandle('style.css', { create: true });
    const cssWritable = await cssFileHandle.createWritable();
    await cssWritable.write(cssContent);
    await cssWritable.close();
    console.log('[DEBUG] Created style.css');
    
    // Create JS file
    const jsFileHandle = await directoryHandle.getFileHandle('script.js', { create: true });
    const jsWritable = await jsFileHandle.createWritable();
    await jsWritable.write(jsContent);
    await jsWritable.close();
    console.log('[DEBUG] Created script.js');
    
    // Dispatch event to load the project
    console.log('[DEBUG] Dispatching project:load event...');
    events.dispatch('project:load', { directory: directoryHandle });
    
    console.log('[DEBUG] Default project created successfully!');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[DEBUG] User cancelled directory picker');
    } else {
      console.error('[DEBUG] Failed to create default project:', error);
    }
  }
}

// Expose public functions
window.CCP = {
  closeModals,
  openCommandPalette
};
