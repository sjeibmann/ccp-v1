import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, history } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { history as historyExtension } from '@codemirror/commands';

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
    backgroundColor: 'rgba(201, 169, 97, 0.08)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(201, 169, 97, 0.15)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border-primary)'
  },
  '.cm-lineNumbers': {
    color: 'var(--text-secondary)'
  },
  '.cm-scroller': {
    overflow: 'auto'
  }
});

// Use defaultHighlightStyle which is more reliable
const highlightStyle = syntaxHighlighting(defaultHighlightStyle);

const defaultKeymap = [
  { key: 'Mod-z', run: historyExtension.undo, preventDefault: true },
  { key: 'Mod-y', run: historyExtension.redo, preventDefault: true },
  { key: 'Mod-Shift-z', run: historyExtension.redo, preventDefault: true },
  { key: 'Mod-a', run: historyExtension.selectAll, preventDefault: true }
];

class CodeMirrorEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    // Base extensions (without language)
    const baseExtensions = [
      neonTheme,
      highlightStyle,
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      historyExtension(),
      keymap.of(defaultKeymap)
    ];
    
    // Add the appropriate language extension
    let languageExtension;
    switch (options.language) {
      case 'html':
        languageExtension = html();
        break;
      case 'css':
        languageExtension = css();
        break;
      case 'javascript':
      default:
        languageExtension = javascript();
        break;
    }
    
    this.extensions = [...baseExtensions, languageExtension];
    
    const initialState = EditorState.create({
      doc: options.content || '',
      extensions: this.extensions
    });
    
    this.view = new EditorView({
      state: initialState,
      parent: this.container
    });
    
    if (options.onInit) {
      options.onInit(this.view);
    }
  }
  
  getText() {
    if (!this.view) return '';
    return this.view.state.doc.toString();
  }
  
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
  
  focus() {
    if (this.view) {
      this.view.focus();
    }
  }
  
  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }
}

import { events } from '../../core/events.js';

const Editor = {
  name: 'editor',
  view: null,
  
  async init() {
    console.log('Initializing Editor module...');
    
    const container = document.getElementById('editor-container');
    if (!container) {
      console.error('Editor container not found');
      return;
    }
    
    this.view = new CodeMirrorEditor(container, {
      content: '// Your code goes here\n',
      onInit: (view) => {
        console.log('CodeMirror editor initialized');
        window.dispatchEvent(new CustomEvent('editor:ready', { detail: { editor: this } }));
      }
    });
    
    // Listen for file loaded events
    events.on('editor:fileLoaded', (e) => {
      console.log('[Editor] File loaded event received:', e.detail);
      if (e.detail && e.detail.content) {
        this.setText(e.detail.content);
        console.log('[Editor] Content loaded into editor');
      }
    });
    
    console.log('Editor module initialized');
  },
  
  getText() {
    return this.view ? this.view.getText() : '';
  },
  
  setText(text) {
    if (this.view) {
      this.view.setText(text);
    }
  },
  
  focus() {
    if (this.view) {
      this.view.focus();
    }
  },
  
  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  },
  
  getView() {
    return this.view;
  }
};

export default Editor;
