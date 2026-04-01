# Creative Code Platform - AI-Agentic Requirements Document

**Version:** 2.0  
**Date:** 2025-04-01  
**Status:** Phase 1 & 2 Complete

---

## 1. Project Overview

### 1.1 Vision
A distraction-free, lightweight Progressive Web App (PWA) for creative coding. Users can live-code with libraries like p5.js, Three.js, and GSAP in a minimal, customizable interface inspired by CodePen 2.0.

### 1.2 Core Principles
- **Distraction-Free**: Minimal UI, hover-to-reveal controls, no unnecessary chrome
- **Lightweight**: Vanilla JS, minimal dependencies, least code necessary
- **Offline-First**: Works without internet, syncs via Git when connected
- **AI-Friendly**: Clear module boundaries, simple interfaces, well-documented

### 1.3 Success Criteria
- Load time < 3s on slow 3G
- 60fps UI interactions
- Works offline after first load
- Git sync works seamlessly when online
- WCAG 2.1 AA compliant

---

## 2. Architecture Overview

### 2.1 High-Level Structure

```
creative-code-platform/
├── src/
│   ├── core/                    # App shell, initialization
│   │   ├── app.js              # Main app controller
│   │   ├── router.js           # Simple hash-based routing
│   │   ├── state.js            # Central state management
│   │   └── events.js           # Event bus/patterns
│   ├── components/             # UI components
│   │   ├── editor/             # CodeMirror wrapper
│   │   ├── preview/            # iframe preview manager
│   │   ├── file-tree/          # Side navigation
│   │   ├── console/            # Output panel
│   │   ├── command-palette/    # Cmd/Ctrl+P interface
│   │   └── modals/             # Dialogs, settings, etc.
│   ├── modules/                # Business logic
│   │   ├── filesystem/         # File System Access API wrapper
│   │   ├── git/                # GitHub OAuth + operations
│   │   ├── project/            # Project CRUD operations
│   │   ├── storage/            # IndexedDB for offline cache
│   │   └── sync/               # Offline/online sync logic
│   ├── templates/              # Default project templates
│   ├── styles/                 # CSS (neon/cyberpunk theme)
│   └── utils/                  # Helper functions
├── tests/
│   ├── unit/                   # Unit tests
│   └── visual/                 # Visual regression tests
├── public/
│   ├── manifest.json
│   ├── sw.js                   # Service Worker
│   └── index.html
├── package.json
└── .parcelrc
```

### 2.2 Module Interface Contracts

Each module MUST export a clean API as specified below. This ensures AI agents can work on modules independently.

#### Core Module: `src/core/state.js`
```javascript
// Simple event-driven state management
// Interface:
State.get(key)              // Get value
State.set(key, value)       // Set value, emits 'change:key'
State.subscribe(key, fn)    // Listen to changes
State.unsubscribe(key, fn)  // Stop listening
```

#### Filesystem Module: `src/modules/filesystem/`
```javascript
// File System Access API wrapper
// Interface:
FileSystem.pickDirectory()                    // Open folder picker, returns handle
FileSystem.readFile(handle, path)             // Read file content
FileSystem.writeFile(handle, path, content)   // Write file content
FileSystem.createFile(handle, path)           // Create new file
FileSystem.deleteFile(handle, path)           // Delete file
FileSystem.listDirectory(handle, path)        // List files/folders
FileSystem.exists(handle, path)               // Check if exists
```

#### Project Module: `src/modules/project/`
```javascript
// Project operations
// Interface:
Project.create(directoryHandle, name)         // Create new project
Project.load(directoryHandle)                   // Load existing project
Project.saveConfig(projectHandle, config)     // Save config.json
Project.loadConfig(projectHandle)             // Load config.json
Project.exportSingleFile(projectHandle)       // Export as embedded HTML
Project.exportZip(projectHandle)              // Export as ZIP
```

#### Git Module: `src/modules/git/`
```javascript
// GitHub integration
// Interface:
GitHub.authenticate()                         // OAuth flow
GitHub.isAuthenticated()                       // Check auth status
GitHub.initRepo(projectHandle, repoName)      // Initialize git repo
GitHub.commit(projectHandle, message)         // Commit changes
GitHub.push(projectHandle)                      // Push to remote
GitHub.pull(projectHandle)                    // Pull from remote
GitHub.checkStatus(projectHandle)             // Get sync status
GitHub.resolveConflict(projectHandle, resolution) // Manual conflict resolution
```

#### Sync Module: `src/modules/sync/`
```javascript
// Offline/online sync
// Interface:
Sync.isOnline()                               // Check connectivity
Sync.queueChange(projectHandle, change)       // Queue change for sync
Sync.syncProject(projectHandle)               // Manual sync
Sync.getPendingChanges(projectHandle)         // Get unsynced changes
```

---

## 3. Detailed Feature Specifications

### 3.1 File Structure & Organization

**Default Project Template:**
```
my-project/
├── config.json              # Project configuration
├── index.html               # Main HTML file
├── style.css               # Styles
├── script.js              # JavaScript
└── assets/
    ├── media/              # Images, videos
    └── fonts/              # Font files
```

**config.json Schema:**
```json
{
  "name": "My Project",
  "version": "1.0.0",
  "libraries": [
    {
      "name": "p5.js",
      "url": "https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js",
      "enabled": true
    }
  ],
  "settings": {
    "autoRun": true,
    "debounceMs": 500,
    "consoleMode": "full"  // "full" | "minimal"
  },
  "created": "2025-04-01T00:00:00Z",
  "modified": "2025-04-01T00:00:00Z"
}
```

### 3.2 Editor Component

**Requirements:**
- CodeMirror 6 as base
- Custom dark theme with neon/cyberpunk accents
- Syntax highlighting for HTML, CSS, JS
- Auto-bracket matching
- Line numbers (toggleable)
- Code folding
- Search and replace (Ctrl/Cmd+F)

**Neon/Cyberpunk Color Palette:**
```css
:root {
  --bg-primary: #0a0a0f;        /* Deep black-purple */
  --bg-secondary: #12121a;     /* Slightly lighter */
  --bg-tertiary: #1a1a2e;      /* Panel backgrounds */
  --text-primary: #e0e0e0;     /* Off-white */
  --text-secondary: #8888a0;   /* Muted gray */
  --accent-cyan: #00f0ff;      /* Cyan neon */
  --accent-pink: #ff00aa;      /* Pink neon */
  --accent-purple: #9d00ff;    /* Purple neon */
  --accent-green: #00ff9d;     /* Green neon (for success) */
  --accent-yellow: #ffee00;    /* Yellow neon (for warnings) */
  --accent-red: #ff0055;       /* Red neon (for errors) */
}
```

### 3.3 Preview Component

**Requirements:**
- iframe-based preview
- Sandboxed execution
- Auto-run on change (500ms debounce) OR manual run
- Runtime error capture
- Layout options: side-by-side, editor-only, preview-only
- Pop-out preview to separate window

**Runtime Error Handling:**
- Capture all console methods (log, warn, error)
- Capture uncaught exceptions from preview iframe
- Forward to main console panel
- Configurable in settings (full vs minimal)

### 3.4 File Tree Component

**Requirements:**
- Collapsible side panel (left side)
- Drag-and-drop file reordering (future version)
- Context menu: New File, New Folder, Rename, Delete
- Visual indicators: unsaved changes, sync status
- Collapsible folders

### 3.5 Console/Output Panel

**Requirements:**
- Collapsible bottom panel
- Show logs, warnings, errors from preview
- Clear console button
- Filter by type (log/warn/error)
- Clickable stack traces

### 3.6 Command Palette

**Requirements:**
- Trigger: Cmd/Ctrl+P
- Search commands and files
- Keyboard navigation (arrow keys, Enter)
- Commands: Open File, New File, Toggle Preview, Run, Export, Settings, etc.

### 3.7 Library Management

**User Workflow:**
1. User opens Library Manager (from command palette or button)
2. Sees list of available libraries with versions
3. Can toggle on/off existing libraries
4. Can add custom CDN URL
5. Can select specific version from dropdown
6. Changes saved to config.json
7. Preview auto-reloads with new libraries

**Default Library Templates:**
- p5.js 2D canvas template
- p5.js WebGL template
- p5.js with sound template

### 3.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + Enter | Run code |
| Cmd/Ctrl + R | Refresh preview |
| Cmd/Ctrl + P | Open command palette |
| Cmd/Ctrl + N | New blank file |
| Cmd/Ctrl + S | Save file |
| Cmd/Ctrl + Shift + P | Toggle preview visibility |
| Cmd/Ctrl + B | Toggle file tree visibility |
| Cmd/Ctrl + ` | Toggle console visibility |
| Escape | Close modals/palettes |

### 3.9 Asset Upload

**Requirements:**
- Drag-and-drop into file tree or editor
- Upload to assets/media/ or assets/fonts/
- File type validation
- File size limit (10MB per file)
- Progress indicator
- Thumbnail preview for images

### 3.10 Git Sync Workflow

**First-Time Setup:**
1. User opens project
2. If not authenticated, show "Connect to GitHub" button
3. OAuth flow opens in popup
4. On success, token stored securely
5. User can "Initialize Git Repository" or "Link to Existing"

**Daily Workflow:**
1. User makes changes offline
2. Changes auto-saved to local filesystem
3. Changes queued in sync module
4. When online: indicator shows "Sync available"
5. User clicks sync or it auto-syncs (setting)
6. If conflicts: show side-by-side diff, user chooses

**Conflict Resolution UI:**
- Split view: Local version | Remote version
- Accept Local, Accept Remote, or Manual Merge
- Apply to each conflicting file

### 3.11 Export Options

**Single HTML File:**
- Embed CSS and JS inline
- Keep library CDN links external
- Assets referenced via data URIs or kept external

**ZIP Export:**
- Standard ZIP of project folder
- Include config.json
- Include assets folder

---

## 4. Technical Specifications

### 4.1 Tech Stack

- **Build Tool:** Parcel (v2)
- **Editor:** CodeMirror 6
- **State:** Vanilla JS (event-driven)
- **Storage:** File System Access API + IndexedDB
- **Git:** isomorphic-git library
- **PWA:** Custom Service Worker
- **Testing:** Jest (unit) + Playwright (visual)

### 4.2 Dependencies

```json
{
  "dependencies": {
    "@codemirror/lang-css": "^6.0",
    "@codemirror/lang-html": "^6.0",
    "@codemirror/lang-javascript": "^6.0",
    "codemirror": "^6.0",
    "isomorphic-git": "^1.0",
    "jszip": "^3.10"
  },
  "devDependencies": {
    "@parcel/packager-raw-url": "^2.0",
    "@parcel/transformer-inline-string": "^2.0",
    "jest": "^29.0",
    "parcel": "^2.10",
    "playwright": "^1.40"
  }
}
```

### 4.3 PWA Requirements

**Service Worker Strategy:**
- Cache-first for app shell (HTML, CSS, JS bundles)
- Network-first for project files (use local cache as fallback)
- Background sync for queued changes

**Manifest:**
- Name: "Creative Code Platform"
- Display: standalone
- Theme color: #0a0a0f
- Background color: #0a0a0f
- Icons: 192x192, 512x512 (PNG)

### 4.4 Accessibility (WCAG 2.1 AA)

- All interactive elements keyboard accessible
- Focus indicators visible (neon cyan outline)
- Color contrast ratio ≥ 4.5:1 for text
- ARIA labels on custom controls
- Screen reader announcements for status changes
- Reduced motion support (`prefers-reduced-motion`)

### 4.5 Responsive Breakpoints

- Desktop: > 1024px (default layout)
- Tablet: 760px - 1024px (collapsible panels)
- Below 760px: Not supported (show message)

---

## 5. AI Agent Development Guidelines

### 5.1 Code Style

- Use ES6+ features (modules, arrow functions, destructuring)
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous code
- Document functions with JSDoc comments

### 5.2 Module Patterns

```javascript
// Preferred pattern: ES6 module with clear interface
// src/modules/example/example.js

/**
 * @typedef {Object} ExampleConfig
 * @property {string} name
 * @property {number} value
 */

const Example = {
  /**
   * Initialize the module
   * @param {ExampleConfig} config
   * @returns {Promise<void>}
   */
  async init(config) {
    // Implementation
  },

  /**
   * Do something
   * @param {string} input
   * @returns {string}
   */
  process(input) {
    // Implementation
  }
};

export default Example;
```

### 5.3 State Management Pattern

```javascript
// Use the central State module for all shared state
import State from '../core/state.js';

// In component initialization:
State.subscribe('currentProject', (project) => {
  // React to project changes
});

// To update state:
State.set('currentProject', newProject);
```

### 5.4 Event Handling Pattern

```javascript
// Use data attributes for element identification
// HTML: <button data-action="run">Run</button>

// JavaScript:
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'run') {
    // Handle run action
  }
});
```

### 5.5 Error Handling

- All async functions should use try/catch
- Errors should be logged and user should be notified via UI
- Never swallow errors silently

```javascript
try {
  await operation();
} catch (error) {
  console.error('ModuleName: Operation failed', error);
  State.set('error', {
    message: 'Operation failed',
    details: error.message
  });
}
```

### 5.6 Testing Requirements

**Unit Tests:**
- All utility functions MUST have unit tests
- Test files: `tests/unit/{module-name}.test.js`
- Run with: `npm test`

**Visual Regression Tests:**
- Critical user flows MUST have visual tests
- Test files: `tests/visual/{flow-name}.spec.js`
- Screenshots stored in `tests/visual/screenshots/`

---

## 6. UI/UX Specifications

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [File Tree]  │  [Editor]           │  [Preview]         │
│               │                      │                     │
│   Collapsible │   Resizable          │   Resizable         │
│   (Left)      │   (Center)           │   (Right)          │
│               │                      │                     │
│               │                      │                     │
├───────────────┴──────────────────────┴─────────────────────┤
│  [Console Panel - Collapsible, Bottom]                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Hover-to-Reveal Pattern

- Toolbar controls hidden by default
- On hover over panel: fade in controls (200ms transition)
- Controls include: Run, Layout Toggle, Settings, etc.
- Leave 8px padding for hover detection

### 6.3 Animation Specifications

- Panel transitions: 200ms ease-out
- Hover reveals: 150ms ease-in
- Modal open: 100ms scale from 0.95 to 1.0
- All animations respect `prefers-reduced-motion`

### 6.4 Typography

- Primary font: System font stack (Segoe UI, Roboto, etc.)
- Code font: 'Fira Code', 'JetBrains Mono', monospace
- Font sizes: 14px base, 12px small, 16px large
- Line height: 1.5 for text, 1.4 for code

---

## 7. Testing Strategy

### 7.1 Unit Test Requirements

**Test Coverage Required:**
- State management (get, set, subscribe)
- FileSystem operations (all methods)
- Project operations (CRUD)
- Utility functions (formatters, parsers)

### 7.2 Visual Test Requirements

**Critical Flows to Test:**
1. Open app → See editor and preview
2. Type in editor → Preview updates
3. Toggle auto-run → Debounce works
4. Open command palette → Commands visible
5. Export project → File downloaded
6. Toggle panels → Layout changes

### 7.3 Manual QA Checklist

Before marking complete, verify:
- [ ] Works offline after first load
- [ ] GitHub OAuth flow completes
- [ ] Git sync works (commit, push, pull)
- [ ] Export single HTML works
- [ ] Export ZIP works
- [ ] Asset upload works (drag and drop)
- [ ] Console shows runtime errors
- [ ] Keyboard shortcuts all work
- [ ] Responsive on tablet (760px+)
- [ ] WCAG 2.1 AA compliance (axe DevTools)

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1) ✅ COMPLETED
- Project setup (Parcel, folder structure)
- State management module
- File System Access API integration
- Basic HTML/CSS/JS file handling
- Project creation and loading

### Phase 2: Editor & Preview (Week 2) ✅ COMPLETED
- CodeMirror 6 integration with custom neon theme
- Custom theme implementation with syntax highlighting
- Preview iframe with sandbox support
- Auto-run with 500ms debounce
- Layout toggle (editor/preview/fullscreen)
- Pop-out preview to separate window
- Tab management for multiple files

### Phase 3: UI Components (Week 3) ✅ COMPLETED
- File tree component
- Console panel
- Command palette
- Hover-to-reveal controls
- Keyboard shortcuts
- Settings modal
- Library management UI

### Phase 4: Advanced Features (Week 4) ✅ COMPLETED
- Library management with CDN URL support
- Settings modal with preferences
- Asset upload (drag and drop)
- Export (HTML and ZIP) functionality
- Export as embedded HTML file
- Export as ZIP archive

### Phase 5: Sync & PWA (Week 5) ✅ COMPLETED
- GitHub OAuth integration
- GitHub OAuth token storage
- Git operations with isomorphic-git
- Offline/online sync
- Service Worker optimization
- PWA manifest

### Phase 6: Polish (Week 6) ✅ COMPLETED
- Visual regression tests (Playwright)
- Performance optimization
- Accessibility audit (WCAG 2.1 AA)
- Bug fixes
- Documentation

---

## 9. Acceptance Criteria by Feature

### Feature: Editor
- **AC1**: CodeMirror renders with custom theme
- **AC2**: Syntax highlighting works for HTML/CSS/JS
- **AC3**: Keyboard shortcuts (Cmd/Ctrl+Enter) trigger run
- **AC4**: Code changes are auto-saved to file system

### Feature: Preview
- **AC1**: Preview renders project in iframe
- **AC2**: Auto-run triggers 500ms after last keystroke
- **AC3**: Manual run button works when auto-run off
- **AC4**: Runtime errors captured and sent to console

### Feature: File Tree
- **AC1**: Shows project folder structure
- **AC2**: Click file opens in editor
- **AC3**: Context menu allows new/rename/delete
- **AC4**: Unsaved changes show indicator

### Feature: Git Sync
- **AC1**: OAuth flow completes and stores token
- **AC2**: Can initialize new repo
- **AC3**: Can commit and push changes
- **AC4**: Conflicts show diff UI for resolution

### Feature: PWA
- **AC1**: App installs as PWA
- **AC2**: Works offline after first load
- **AC3**: Changes queue when offline
- **AC4**: Syncs automatically when online

---

## 10. Appendices

### Appendix A: External Libraries

**CodeMirror 6:**
- Installation: `npm install codemirror @codemirror/lang-javascript @codemirror/lang-css @codemirror/lang-html`
- Docs: https://codemirror.net/docs/

**isomorphic-git:**
- Installation: `npm install isomorphic-git`
- Docs: https://isomorphic-git.org/
- Note: Requires HTTP client for GitHub API

**JSZip:**
- Installation: `npm install jszip`
- Docs: https://stuk.github.io/jszip/

### Appendix B: GitHub OAuth Setup

1. Create OAuth App at https://github.com/settings/developers
2. Set Authorization callback URL: `https://your-domain.com/auth/callback`
3. Store Client ID in app (no backend needed for MVP)
4. Use PKCE flow for security

### Appendix C: File System Access API

**Browser Support:** Chrome 86+, Edge 86+, Opera 72+
**Permissions:** Requires user gesture (click) to show picker
**Persistence:** Permission granted until explicitly revoked

### Appendix D: Color Reference

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Deep Black | #0a0a0f | App background |
| Panels | Dark Purple | #1a1a2e | Panels, cards |
| Primary Accent | Cyan Neon | #00f0ff | Active states, focus |
| Secondary | Pink Neon | #ff00aa | Highlights, CTAs |
| Success | Green Neon | #00ff9d | Success states |
| Warning | Yellow Neon | #ffee00 | Warnings |
| Error | Red Neon | #ff0055 | Errors |

---

## 11. Glossary

- **CDN**: Content Delivery Network
- **OAuth**: Open Authorization protocol
- **PWA**: Progressive Web App
- **PKCE**: Proof Key for Code Exchange (OAuth security)
- **Service Worker**: Browser script that runs in background
- **File System Access API**: Browser API for reading/writing local files
- **IndexedDB**: Browser-based NoSQL database
- **WCAG**: Web Content Accessibility Guidelines

---

**End of Requirements Document**

For questions or clarifications during implementation, refer to:
- CodeMirror docs: https://codemirror.net/
- isomorphic-git docs: https://isomorphic-git.org/
- MDN File System Access API: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
