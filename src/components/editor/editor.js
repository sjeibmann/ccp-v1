/**
 * CodeMirror 6 Editor Component
 * Provides a clean wrapper for the CodeMirror editor
 */
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, closeBrackets, history } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/highlight';
import { indentUnit } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/view';
import { history as historyExtension } from '@codemirror/view';

// Custom neon theme
const neonTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    fontSize: '14px'
  },
  '.cm-line': {
    padding: '0 8px'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(157, 0, 255, 0.1)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(157, 0, 255, 0.2)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'var(--border-color)'
  },
  '.cm-lineNumbers': {
    color: 'var(--text-secondary)'
  },
  '.cm-scroller': {
    overflow: 'auto'
  }
});

// Custom neon highlighting style
const neonHighlightStyle = syntaxHighlighting(
  [
    { tag: 'keyword', color: 'var(--accent-pink)' },
    { tag: 'variableName', color: 'var(--accent-cyan)' },
    { tag: 'def', color: 'var(--accent-cyan)' },
    { tag: 'builtin', color: 'var(--accent-green)' },
    { tag: 'number', color: 'var(--accent-purple)' },
    { tag: 'string', color: 'var(--accent-yellow)' },
    { tag: 'comment', color: 'var(--text-secondary)', fontStyle: 'italic' },
    { tag: 'bracket', color: 'var(--text-primary)' },
    { tag: 'operator', color: 'var(--text-primary)' },
    { tag: 'meta', color: 'var(--text-secondary)' },
    { tag: 'error', color: 'var(--accent-red)' },
    { tag: 'attribute', color: 'var(--accent-pink)' },
    { tag: 'tag', color: 'var(--accent-red)' }
  ]
);

/**
 * CodeMirror Editor Class
 */
class CodeMirrorEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.extensions = [
      neonTheme,
      neonHighlightStyle,
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      closeBrackets(),
      history(),
      defaultKeymap,
      indentUnit('  '),
      javascript(),
      css(),
      html()
    ];
    
    // Add language support based on file type
    if (options.language === 'html') {
      this.extensions = [
        ...this.extensions.slice(0, 9),
        html(),
        ...this.extensions.slice(9)
      ];
    } else if (options.language === 'css') {
      this.extensions = [
        ...this.extensions.slice(0, 9),
        css(),
        ...this.extensions.slice(9)
      ];
    } else if (options.language === 'javascript') {
      this.extensions = [
        ...this.extensions.slice(0, 9),
        javascript(),
        ...this.extensions.slice(9)
      ];
    }
    
    // Create initial state
    const initialState = EditorState.create({
      doc: options.content || '',
      extensions: this.extensions
    });
    
    // Create editor view
    this.view = new EditorView({
      state: initialState,
      parent: this.container
    });
    
    // Call init callback
    if (options.onInit) {
      options.onInit(this.view);
    }
  }
  
  /**
   * Get the current document text
   * @returns {string} Document content
   */
  getText() {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }
  
  /**
   * Set new text content
   * @param {string} text - New text content
   */
  setText(text) {
    if (!this.view) return;
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: text
      }
    });
  }
  
  /**
   * Focus the editor
   */
  focus() {
    if (this.view) {
      this.view.focus();
    }
  }
  
  /**
   * Destroy the editor
   */
  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }
}

/**
 * Editor module for managing the CodeMirror instance
 */
const Editor = {
  name: 'editor',
  view: null,
  
  /**
   * Initialize the editor
   */
  async init() {
    console.log('Initializing Editor module...');
    
    // Find container element
    const container = document.getElementById('editor-container');
    if (!container) {
      console.error('Editor container not found');
      return;
    }
    
    // Create editor instance
    this.view = new CodeMirrorEditor(container, {
      content: '// Your code goes here\n',
      onInit: (view) => {
        console.log('CodeMirror editor initialized');
        // Dispatch event when editor is ready
        window.dispatchEvent(new CustomEvent('editor:ready', { detail: { editor: this } }));
      }
    });
    
    console.log('Editor module initialized');
  },
  
  /**
   * Get current editor text
   * @returns {string} Editor content
   */
  getText() {
    return this.view ? this.view.getText() : '';
  },
  
  /**
   * Set editor text
   * @param {string} text - New text content
   */
  setText(text) {
    if (this.view) {
      this.view.setText(text);
    }
  },
  
  /**
   * Focus the editor
   */
  focus() {
    if (this.view) {
      this.view.focus();
    }
  },
  
  /**
   * Destroy the editor
   */
  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  },
  
  /**
   * Get the CodeMirror view instance
   * @returns {EditorView|null} Editor view or null
   */
  getView() {
    return this.view;
  }
};

export default Editor;
