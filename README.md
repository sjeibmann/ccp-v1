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

## Requirements

- Node.js 16+
- Modern browser with File System Access API (Chrome 86+, Edge 86+)

## Getting Started

### Installation

1. Clone or navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

4. Open the app in your browser at `http://localhost:1234`

### Building for Production

```bash
npm run build
```

The build will be output to the `dist/` folder.

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
│   │   ├── project/      # Project management
│   │   └── ...
│   ├── components/       # UI components
│   └── styles/          # CSS styles
├── public/               # Public assets
│   ├── index.html       # Main HTML
│   └── styles/          # Public CSS
├── tests/                # Tests
│   ├── unit/            # Unit tests
│   └── visual/          # Visual regression tests
└── dist/                 # Production build (after build)
```

## Tech Stack

- **Build Tool**: Parcel v2
- **Code Editor**: CodeMirror 6
- **State Management**: Vanilla JS Proxy
- **File System**: File System Access API
- **Version Control**: isomorphic-git

## Key Modules

### Core
- `app.js` - Main application controller
- `router.js` - Simple hash-based routing
- `state.js` - Centralized state management
- `events.js` - Event bus for component communication

### Modules
- `filesystem/` - File System Access API wrapper
- `project/` - Project CRUD operations
- `git/` - GitHub integration (future)
- `sync/` - Offline/online sync (future)

### Components
- `editor/` - CodeMirror wrapper
- `preview/` - Interactive preview
- `file-tree/` - File navigation
- `console/` - Output panel

## Browser Support

- Chrome 86+ (File System Access API)
- Edge 86+
- Firefox (limited support)
- Safari (pending API support)

## Contributing

This project is designed for AI agent development. When contributing:

1. Follow the project structure and module patterns
2. Maintain clear interface contracts
3. Prefer Vanilla JS with minimal dependencies
4. Test changes with visual regression tests

## License

MIT

## Acknowledgments

Inspired by CodePen, p5.js, and other creative coding tools.
