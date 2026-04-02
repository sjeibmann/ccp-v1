/**
 * Settings Modal Component
 * Manages user preferences and application settings
 */
import { get, set } from '../../../core/state.js';
import { events } from '../../../core/events.js';

const SettingsModal = {
  name: 'settingsModal',
  
  /**
   * Initialize settings modal
   */
  async init() {
    console.log('Initializing SettingsModal component...');
    
    this.modal = document.getElementById('settings-modal');
    this.form = document.getElementById('settings-form');
    
    if (!this.modal) {
      console.error('Settings modal not found');
      return;
    }
    
    this.setupEventListeners();
    this.loadSettings();
    
    console.log('SettingsModal component initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open settings
    events.on('open-settings', () => {
      this.open();
    });
    
    // Close settings
    events.on('settings:close', () => {
      this.close();
    });
    
    // Save settings
    events.on('settings:save', () => {
      this.saveSettings();
    });
    
    // Close modal on X button click
    const closeButtons = this.modal.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.close();
      });
    });
    
    // Save on form submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        events.dispatch('settings:save');
      });
    }
  },
  
  /**
   * Load current settings from state
   */
  loadSettings() {
    if (!this.form) return;
    
    // Load settings values from state
    const settings = get('settings') || {};
    const autoRun = settings.autoRun !== false;
    const debounceMs = settings.debounceMs || 500;
    const consoleMode = settings.consoleMode || 'full';
    const theme = settings.theme || 'neon';
    
    // Set form values
    if (this.form.querySelector('#auto-run')) {
      this.form.querySelector('#auto-run').checked = autoRun;
    }
    
    if (this.form.querySelector('#debounce-time')) {
      this.form.querySelector('#debounce-time').value = debounceMs;
    }
    
    if (this.form.querySelector('#console-mode')) {
      this.form.querySelector('#console-mode').value = consoleMode;
    }
    
    if (this.form.querySelector('#theme')) {
      this.form.querySelector('#theme').value = theme;
    }
  },
  
  /**
   * Open settings modal
   */
  open() {
    this.modal.classList.remove('hidden');
    this.loadSettings();
  },
  
  /**
   * Close settings modal
   */
  close() {
    this.modal.classList.add('hidden');
  },
  
  /**
   * Save settings from form
   */
  saveSettings() {
    if (!this.form) return;
    
    const autoRun = this.form.querySelector('#auto-run')?.checked;
    const debounceMs = parseInt(this.form.querySelector('#debounce-time')?.value) || 500;
    const consoleMode = this.form.querySelector('#console-mode')?.value || 'full';
    const theme = this.form.querySelector('#theme')?.value || 'neon';
    
    // Save to state as settings object
    set('settings', {
      autoRun,
      debounceMs,
      consoleMode,
      theme
    });
    
    // Update preview debounce time
    events.dispatch('preview:setDebounceTime', { time: debounceMs });
    
    // Update console mode
    events.dispatch('console:setMode', { mode: consoleMode });
    
    // Open success message or close modal
    this.close();
    
    events.dispatch('settings:saved', { 
      autoRun, 
      debounceMs, 
      consoleMode, 
      theme 
    });
  },
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    // Placeholder for success feedback
    console.log('Settings saved:', message);
  }
};

export default SettingsModal;
