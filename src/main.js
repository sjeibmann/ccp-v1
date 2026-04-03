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

modules.forEach(module => {
  app.registerModule(module.name, module);
});

// Initialize GitHub OAuth (separate module - singleton object)
app.registerModule('githubOAuth', GitHubOAuth);

// Initialize Git Operations (requires GitHub OAuth)
const gitOperations = new GitOperations();
gitOperations.init(githubOAuth);
app.registerModule('gitOperations', gitOperations);

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
