/**
 * Command Palette Component - Quick access to commands and files
 */
import { get, set } from '../../core/state.js';
import { events } from '../../core/events.js';

const CommandPalette = {
  name: 'commandPalette',
  input: null,
  results: null,
  isOpen: false,
  commands: [],
  currentSelection: 0,
  
  /**
   * Initialize command palette
   */
  async init() {
    console.log('Initializing CommandPalette component...');
    
    // Get elements
    this.input = document.getElementById('palette-input');
    this.results = document.getElementById('palette-results');
    this.palette = document.getElementById('command-palette');
    
    if (!this.input || !this.results || !this.palette) {
      console.error('Command palette elements not found');
      return;
    }
    
    // Setup commands
    this.setupCommands();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('CommandPalette component initialized');
  },
  
  /**
   * Setup available commands
   */
  setupCommands() {
    this.commands = [
      {
        name: 'New Project',
        shortcut: 'Ctrl/.Cmd+P, N',
        action: 'new-project'
      },
      {
        name: 'Open Project',
        shortcut: 'Ctrl/Cmd+O',
        action: 'open-project'
      },
      {
        name: 'Run Code',
        shortcut: 'Ctrl/Cmd+Enter',
        action: 'editor:run'
      },
      {
        name: 'Toggle Preview',
        shortcut: 'Ctrl/Cmd+Shift+P',
        action: 'layout:toggle-preview'
      },
      {
        name: 'Toggle Sidebar',
        shortcut: 'Ctrl/Cmd+B',
        action: 'layout:toggle-sidebar'
      },
      {
        name: 'Toggle Console',
        shortcut: 'Ctrl/Cmd+`',
        action: 'layout:toggle-console'
      },
      {
        name: 'Settings',
        shortcut: 'Ctrl/Cmd+,',
        action: 'open-settings'
      },
      {
        name: 'Export HTML',
        shortcut: 'Ctrl/Cmd+E',
        action: 'export-html'
      },
      {
        name: 'Export ZIP',
        shortcut: 'Ctrl/Cmd+Shift+E',
        action: 'export-zip'
      },
      {
        name: 'Search Commands',
        shortcut: 'Ctrl/Cmd+P',
        action: 'open-command-palette'
      }
    ];
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Input keydown
    this.input.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.navigate(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigate(1);
          break;
        case 'Enter':
          e.preventDefault();
          this.select();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    });
    
    // Input typing search
    this.input.addEventListener('input', () => {
      this.filterCommands();
    });
    
    // Close on click outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !e.target.closest('.command-palette')) {
        this.close();
      }
    });
    
    // Command events
    events.on('commandPalette:open', () => {
      this.open();
    });
    
    events.on('commandPalette:close', () => {
      this.close();
    });
  },
  
  /**
   * Open the command palette
   */
  open() {
    this.isOpen = true;
    this.currentSelection = 0;
    
    this.palette.classList.remove('hidden');
    this.input.value = '';
    this.input.focus();
    
    // Show all commands initially
    this.filterCommands();
    
    events.dispatch('commandPalette:opened');
  },
  
  /**
   * Close the command palette
   */
  close() {
    this.isOpen = false;
    this.palette.classList.add('hidden');
    this.input.value = '';
    this.results.innerHTML = '';
    
    events.dispatch('commandPalette:closed');
  },
  
  /**
   * Navigate through commands with arrow keys
   * @param {number} direction - -1 for up, 1 for down
   */
  navigate(direction) {
    const visibleItems = this.results.querySelectorAll('.palette-result');
    if (visibleItems.length === 0) return;
    
    this.currentSelection += direction;
    
    // Loop around
    if (this.currentSelection < 0) this.currentSelection = 0;
    if (this.currentSelection >= visibleItems.length) this.currentSelection = visibleItems.length - 1;
    
    // Update selected item
    visibleItems.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentSelection);
    });
    
    // Scroll into view
    const selectedItem = visibleItems[this.currentSelection];
    selectedItem?.scrollIntoView({ block: 'nearest' });
  },
  
  /**
   * Filter commands based on input
   */
  filterCommands() {
    const query = this.input.value.toLowerCase();
    this.results.innerHTML = '';
    
    if (!query) {
      // Show all commands if no query
      this.commands.forEach((cmd, index) => {
        this.createResultItem(cmd, index);
      });
    } else {
      // Filter commands
      const filtered = this.commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query)
      );
      
      filtered.forEach((cmd, index) => {
        this.createResultItem(cmd, index);
      });
      
      // If nothing found, show placeholder
      if (filtered.length === 0) {
        const placeholder = document.createElement('li');
        placeholder.className = 'palette-result';
        placeholder.innerHTML = '<span class="label">Nothing found</span>';
        this.results.appendChild(placeholder);
      }
    }
  },
  
  /**
   * Create a result item
   * @param {Object} command - Command object
   * @param {number} index - Index in list
   */
  createResultItem(command, index) {
    const li = document.createElement('li');
    li.className = 'palette-result';
    if (index === 0) li.classList.add('active');
    
    // Simple icon based on command
    let icon = '⚡';
    if (command.name.includes('Project')) icon = '📁';
    if (command.name.includes('Settings')) icon = '⚙️';
    if (command.name.includes('Export')) icon = '📦';
    if (command.name.includes('Preview')) icon = '👁️';
    
    li.innerHTML = `
      <span class="icon">${icon}</span>
      <span class="label">${command.name}</span>
      <span class="shortcut">${command.shortcut}</span>
    `;
    
    // Click to select
    li.addEventListener('click', () => {
      this.currentSelection = index;
      this.select();
    });
    
    // Mouse enter to update selection
    li.addEventListener('mouseenter', () => {
      this.currentSelection = index;
      document.querySelectorAll('.palette-result').forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
    });
    
    this.results.appendChild(li);
  },
  
  /**
   * Select current command
   */
  select() {
    const visibleItems = this.results.querySelectorAll('.palette-result');
    if (visibleItems.length === 0 || this.currentSelection >= visibleItems.length) return;
    
    // Get active item
    const activeItem = visibleItems[this.currentSelection];
    if (!activeItem) return;
    
    // Get command index from original commands array
    const query = this.input.value.toLowerCase();
    const filtered = this.commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query)
    );
    
    if (filtered[this.currentSelection]) {
      const command = filtered[this.currentSelection];
      
      // Execute action
      events.dispatch(`action:${command.action}`, { command });
      
      this.close();
    }
  },
  
  /**
   * Get currently selected command
   * @returns {Object|null} Command object
   */
  getCurrentCommand() {
    if (this.currentSelection < 0) return null;
    return this.commands[this.currentSelection];
  },
  
  /**
   * Check if palette is open
   * @returns {boolean} Whether open
   */
  isOpen() {
    return this.isOpen;
  }
};

export default CommandPalette;
