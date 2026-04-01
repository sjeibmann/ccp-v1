# Creative Code Platform

A distraction-free creative coding IDE in a Progressive Web App.

## Overview

Creative Code Platform is a lightweight, offline-first coding environment that allows users to live-code with popular creative coding libraries like p5.js, Three.js, and GSAP. The app features a minimal, distraction-free interface inspired by CodePen 2.0.

## Features

- **Live Coding**: Real-time preview with auto-run on change
- **Offline-First**: Fully functional offline, syncs with GitHub when online
- **Lightweight**: Vanilla JS with minimal dependencies
- **Distraction-Free**: Minimal UI with hover-to-reveal controls
- **Git Sync**: GitHub-based version control with conflict resolution

## Tech Stack

- **Build Tool**: Parcel v2
- **Editor**: CodeMirror 6
- **State Management**: Vanilla JS Proxy
- **File System**: File System Access API
- **Version Control**: isomorphic-git (future)
- **Testing**: Jest (unit) + Playwright (visual)

## Phases

### ✅ Phase 1: Foundation (COMPLETED)
- Project setup and structure
- State management module
- File System Access API integration
- Project CRUD operations

### ✅ Phase 2: Editor & Preview (COMPLETED)
- CodeMirror 6 integration with custom neon theme
- Preview iframe with sandbox support
- Auto-run with 500ms debounce
- Layout toggle (editor/preview/fullscreen)
- Pop-out preview

### ✅ Phase 3: UI Components (COMPLETED)
- File tree component
- Console panel
- Command palette
- All UI components integrated

### Phase 4: Advanced Features (TODO)
- Settings modal
- Library management UI
- Export (HTML and ZIP)
- Project templates

### Phase 5: Sync & PWA (TODO)
- GitHub OAuth
- Git operations
- Offline/online sync
- Service Worker optimization

### Phase 6: Polish (TODO)
- Visual regression tests
- Performance optimization
- Accessibility audit

## Getting Started

### Prerequisites

- Node.js 16+
- Modern browser with File System Access API (Chrome 86+, Edge 86+)

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Project Structure

```
creative-code-platform/
├── src/
│   ├── core/              # Core application logic
│   │   ├── app.js        # Main app controller
│   │   ├── router.js     # Router
│   │   ├── state.js      # State management
│   │   └── events.js     # Event bus
│   ├── modules/          # Feature modules
│   │   ├── filesystem/   # File system access
│   │   └── project/      # Project management
│   ├── components/       # UI components
│   │   ├── editor/       # Code editor
│   │   ├── preview/      # Preview iframe
│   │   ├── layout/       # Layout manager
│   │   ├── file-tree/    # File navigation
│   │   ├── console/      # Output panel
│   │   └── command-palette/ # Quick commands
│   └── styles/          # CSS styles
├── public/               # Public assets
│   ├── index.html       # Main HTML
│   ├── manifest.json    # PWA manifest
│   └── sw.js            # Service Worker
└── tests/                # Tests
    ├── unit/            # Unit tests
    └── visual/          # Visual regression tests
```

## Browser Support

- Chrome 86+ (File System Access API required)
- Additional browser support TBD.


## License

MIT

## Acknowledgments

Inspired by CodePen, p5.js, and other creative coding tools.
