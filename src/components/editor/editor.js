import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, history } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
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
    this.extensions = [
      neonTheme,
      neonHighlightStyle,
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      historyExtension(),
      keymap.of(defaultKeymap),
      javascript(),
      css(),
      html()
    ];
    
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
