/**
 * Creative Code Platform - Main Entry Point
 * Initialises the application with all modules
 */
import { app } from '../core/app.js';
import { events } from '../core/events.js';
import { router } from '../core/router.js';
import { get, set } from '../core/state.js';
import filesystem from '../modules/filesystem/index.js';
import project from '../modules/project/index.js';
import Editor from '../components/editor/editor.js';
import TabManager from '../components/editor/tabManager.js';
import Preview from '../components/preview/preview.js';
import Layout from '../components/layout/layout.js';
import FileTree from '../components/file-tree/file-tree.js';
import ConsolePanel from '../components/console/console.js';
import CommandPalette from '../components/command-palette/command-palette.js';

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
  CommandPalette
];

modules.forEach(module => {
  app.registerModule(module.name, module);
});

// Setup event handlers
function setupEventHandlers() {
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
    
    // Escape to close modals
    if (e.key === 'Escape') {
      e.preventDefault();
      events.dispatch('modal:close');
    }
  });
  
  // Click handlers for buttons with data-action
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button) {
      const action = button.dataset.action;
      events.dispatch(`action:${action}`, { element: button, event: e });
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
  });
  document.getElementById('command-palette')?.classList.add('hidden');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, starting Creative Code Platform...');
  
  // Setup event handlers
  setupEventHandlers();
  
  // Initialize router
  router.parse(window.location.hash.replace('#', ''));
  
  // Start the app
  app.start();
  
  console.log('Creative Code Platform ready');
});

// Expose public functions
window.CCP = {
  closeModals,
  openCommandPalette
};
