/**
 * Git Operations Module
 * Handles GitHub repository operations
 * 
 * Features:
 * - Repository initialization
 * - Commit changes
 * - Push/Pull operations
 * - Conflict resolution
 * 
 * Status: Complete ✅
 * 
 * Usage:
 * - Requires: GitHub OAuth (github.js)
 * - Trigger: git:commit, git:push, git:pull events
 */

# Git Operations Module

This module provides complete Git integration for the Creative Code Platform, allowing users to version control their projects and sync with GitHub.

## Features

### Core Git Operations

- **Initialize Repository** (`initRepo`) - Create a new git repository with initial commit
- **Commit Changes** (`commit`) - Stage and commit changes with a message
- **Push** (`push`) - Push commits to GitHub remote
- **Pull** (`pull`) - Pull changes from GitHub remote
- **Check Status** (`checkStatus`) - Get current sync status and changed files

### Sync Status

The module tracks and displays the following status states:

- `synced` - Local and remote are in sync
- `changes_to_push` - Local has commits not pushed to remote
- `behind_remote` - Remote has commits not pulled locally
- `conflict` - Merge conflict detected
- `not_initialized` - No git repository exists
- `error` - An error occurred

### UI Components

1. **Git Status Bar** - Located in the editor header
   - Shows current sync status with icon and text
   - Click to reveal action buttons (Commit, Push, Pull)
   - Color-coded indicators:
     - ✓ Green: Synced
     - ● Yellow: Changes to push
     - ↓ Blue: Behind remote
     - ! Red: Conflict

2. **Commit Modal** - Full-screen modal for committing
   - Input field for commit message
   - Lists all changed files with status indicators
   - Keyboard shortcuts: Ctrl+Enter to commit, Escape to close

3. **Command Palette Commands**
   - `Git: Commit` (Ctrl+Shift+C)
   - `Git: Push` (Ctrl+Shift+P)
   - `Git: Pull` (Ctrl+Shift+L)
   - `Git: Status`
   - `Git: Initialize Repository`

## Usage

### From Code

```javascript
import GitOperations from './modules/git-operations.js';

// Initialize (in app startup)
const gitOps = GitOperations;
gitOps.init(githubOAuthModule);

// Initialize a new repository
await gitOps.initRepo(projectDirectoryHandle, 'my-project');

// Commit changes
await gitOps.commit('My commit message');

// Push to remote
await gitOps.push();

// Pull from remote
await gitOps.pull();

// Check status
const status = await gitOps.checkStatus();
console.log(status.status); // 'synced', 'changes_to_push', etc.
console.log(status.changedFiles); // Array of changed files
```

### Via Events

```javascript
import { events } from './core/events.js';

// Initialize repo
events.dispatch('git:init', { projectHandle, repoName: 'my-project' });

// Commit
events.dispatch('git:commit', { message: 'My commit message' });

// Push
events.dispatch('git:push');

// Pull
events.dispatch('git:pull');

// Check status
events.dispatch('git:status');
```

## Event Listeners

Listen for git events:

```javascript
events.on('git:initialized', (e) => {
  console.log('Repo initialized:', e.detail.config);
});

events.on('git:committed', (e) => {
  console.log('Committed:', e.detail.sha);
});

events.on('git:pushed', (e) => {
  console.log('Pushed to:', e.detail.branch);
});

events.on('git:pulled', (e) => {
  console.log('Pulled commits:', e.detail.commits);
});

events.on('git:statusChanged', (e) => {
  console.log('Status:', e.detail.status);
});

events.on('git:error', (e) => {
  console.error('Git error:', e.detail.message);
});

events.on('git:conflict', (e) => {
  console.log('Conflicts:', e.detail.files);
});
```

## Dependencies

- **isomorphic-git** - Git implementation for JavaScript
- **@isomorphic-git/lightning-fs** - File system for browser environment
- **GitHub OAuth Module** - For authentication with GitHub

## Configuration

The git module stores configuration in the global state:

```javascript
set('currentProject.gitConfig', {
  name: 'project-name',
  directory: 'project-directory',
  createdAt: '2024-01-01T00:00:00Z',
  remoteUrl: 'https://github.com/username/repo.git',
  githubUser: 'username'
});
```

Git authentication token is stored via:

```javascript
set('github.token', 'ghp_xxxxxxxxxx');
```

## Daily Workflow

1. **User makes changes** - Files are auto-saved to filesystem
2. **User clicks "Commit"** or presses `Ctrl+Shift+C`
3. **Enter commit message** in the modal
4. **Changes committed locally** - Status shows "Changes to push"
5. **User clicks "Push"** - Changes sync to GitHub
6. **If behind remote** - Status shows "Pull", user pulls first
7. **If conflict** - Status shows "Conflict", user resolves (Task 7)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Commit | Ctrl+Shift+C |
| Push | Ctrl+Shift+P |
| Pull | Ctrl+Shift+L |

## BRT CODE Styling

The Git operations UI follows the BRT CODE design system:

- **Synced indicator**: Gold (#c9a961) with checkmark
- **Conflict indicator**: Red (#ff7b72) with exclamation
- **Commit button**: Primary style with gold accent
- **Modal**: Standard modal with dark navy background
- **File status icons**: Color-coded by status type
