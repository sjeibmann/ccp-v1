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

## Getting Started

### Prerequisites

- Node.js 18+ (v18.20.8 tested)
- Modern browser with File System Access API (Chrome 86+, Edge 86+)

### Installation

```bash
npm install
```

### Troubleshooting Common Issues

If you encounter build errors during `npm install` or `npm start`:

1. **CodeMirror 6 resolve errors** - Install missing packages:
   ```
   npm install @codemirror/language @codemirror/commands @codemirror/view @codemirror/state
   ```

2. ** Parcel optimizer-htmlmin error** - The `.parcelrc` file references `@parcel/optimizer-htmlmin` which doesn't exist. Replace it with `@parcel/optimizer-html` (already fixed in this project).

3. **Module import errors** - Verify all import paths in component files use correct relative paths:
   - Files in `src/components/*` need `../core/`
   - Files in `src/components/*/*` need `../../core/`
   - Files in `src/components/*/sub/*` need `../../../core/`
   - Files in `src/modules/` need `../core/`
   - Files in `src/modules/*/` need `../../core/`

4. **Node.js not found** - If npm is not in PATH:
   ```
   export PATH="/home/lab/.nvm/versions/node/v18.20.8/bin:$PATH"
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
