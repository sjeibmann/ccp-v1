/**
 * Git Operations Module
 * Handles Git repository operations using isomorphic-git
 */
import { get, set } from '../core/state.js';
import { events } from '../core/events.js';
import FS from '@isomorphic-git/lightning-fs';

// Git status constants
export const SYNC_STATUS = {
  SYNCED: 'synced',
  CHANGES_TO_PUSH: 'changes_to_push',
  BEHIND_REMOTE: 'behind_remote',
  CONFLICT: 'conflict',
  NOT_INITIALIZED: 'not_initialized',
  ERROR: 'error'
};

const GitOperations = {
  name: 'git',
  githubOAuth: null,
  git: null,
  fs: null,
  dir: '/project',
  currentStatus: SYNC_STATUS.NOT_INITIALIZED,
  statusPollingInterval: null,

  /**
   * Initialize git operations module
   */
  async init(githubOAuth) {
    console.log('Initializing GitOperations module...');

    this.githubOAuth = githubOAuth;

    // Initialize LightningFS for isomorphic-git
    this.fs = new FS('git');
    const fs = this.fs;

    // Dynamically import isomorphic-git
    const gitModule = await import('isomorphic-git');
    this.git = gitModule.default || gitModule;

    // Configure git
    this.git.setConfig({ fs, dir: this.dir, path: 'user.name', value: 'BRT CODE User' });
    this.git.setConfig({ fs, dir: this.dir, path: 'user.email', value: 'user@brtcode.dev' });

    // Setup event listeners
    this.setupEventListeners();

    // Start status polling
    this.startStatusPolling();

    console.log('GitOperations module initialized');
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('git:init', async (event) => {
      const { projectHandle, repoName } = event.detail || {};
      await this.initRepo(projectHandle, repoName);
    });

    events.on('git:commit', async (event) => {
      const { message } = event.detail || {};
      await this.commit(message);
    });

    events.on('git:push', async () => {
      await this.push();
    });

    events.on('git:pull', async () => {
      await this.pull();
    });

    events.on('git:status', async () => {
      await this.checkStatus();
    });

    events.on('git:resolveConflict', async (event) => {
      const { filePath, resolution, content } = event.detail || {};
      await this.resolveConflict(filePath, resolution, content);
    });

    // Listen for file changes to trigger status updates
    events.on('editor:tabContentChange', async () => {
      // Debounce status check
      if (this.statusDebounceTimer) {
        clearTimeout(this.statusDebounceTimer);
      }
      this.statusDebounceTimer = setTimeout(() => {
        this.checkStatus();
      }, 1000);
    });
  },

  /**
   * Start polling for status updates
   */
  startStatusPolling() {
    // Check status every 30 seconds
    this.statusPollingInterval = setInterval(() => {
      if (this.githubOAuth?.isAuthenticated()) {
        this.checkStatus();
      }
    }, 30000);
  },

  /**
   * Stop polling for status updates
   */
  stopStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  },

  /**
   * Initialize a new git repository
   * @param {FileSystemDirectoryHandle} projectHandle - Project directory
   * @param {string} repoName - Repository name
   * @returns {Promise<boolean>} Success status
   */
  async initRepo(projectHandle, repoName = 'creative-project') {
    if (!this.githubOAuth || !this.githubOAuth.isAuthenticated()) {
      console.error('GitHub authentication required');
      events.dispatch('git:error', { message: 'GitHub authentication required' });
      return false;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      // Initialize git repo
      await this.git.init({ fs, dir, defaultBranch: 'main' });

      // Create initial README
      await this.fs.writeFile(
        `${dir}/README.md`,
        `# ${repoName}\n\nCreated with BRT CODE\n`
      );

      // Stage and commit initial files
      await this.git.add({ fs, dir, filepath: 'README.md' });
      await this.git.commit({
        fs,
        dir,
        message: 'Initial commit',
        author: { name: 'BRT CODE', email: 'user@brtcode.dev' }
      });

      // Get GitHub user info
      const user = await this.githubOAuth.getUserInfo();

      // Save repo configuration
      const repoConfig = {
        name: repoName,
        directory: projectHandle?.name || repoName,
        createdAt: new Date().toISOString(),
        remoteUrl: `https://github.com/${user.login}/${repoName}.git`,
        githubUser: user.login
      };

      set('currentProject.gitConfig', repoConfig);
      set('currentProject.projectHandle', projectHandle);

      // Add remote origin
      await this.git.addRemote({
        fs,
        dir,
        remote: 'origin',
        url: repoConfig.remoteUrl,
        force: false
      });

      this.currentStatus = SYNC_STATUS.SYNCED;
      events.dispatch('git:initialized', { config: repoConfig });
      events.dispatch('git:statusChanged', { status: this.currentStatus });

      return true;
    } catch (error) {
      console.error('Failed to initialize git repository:', error);
      events.dispatch('git:error', { message: error.message });
      return false;
    }
  },

  /**
   * Check if there's a git repository initialized
   * @returns {Promise<boolean>} True if git repo exists
   */
  async hasGitRepo() {
    try {
      const fs = this.fs;
      const dir = this.dir;
      // Check if git directory exists
      await fs.stat(`${dir}/.git`);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get the list of changed files
   * @returns {Promise<Array>} Array of file statuses
   */
  async getChangedFiles() {
    if (!await this.hasGitRepo()) {
      return [];
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      const status = await this.git.statusMatrix({ fs, dir });
      // status is array of [filepath, headStatus, workdirStatus, stageStatus]
      // [1, 1, 1] = unmodified
      // [1, 2, 1] = modified in workdir
      // [0, 2, 0] = new file
      // [1, 0, 0] = deleted

      return status
        .filter(([_, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1))
        .map(([filepath, head, workdir, stage]) => ({
          filepath,
          status: this._getFileStatus(head, workdir, stage)
        }));
    } catch (error) {
      console.error('Failed to get changed files:', error);
      return [];
    }
  },

  /**
   * Convert status matrix values to readable status
   */
  _getFileStatus(head, workdir, stage) {
    if (head === 0 && workdir === 2) return 'untracked';
    if (head === 1 && workdir === 0) return 'deleted';
    if (head === 1 && workdir === 2) return 'modified';
    if (head === 1 && stage === 2) return 'staged';
    return 'unknown';
  },

  /**
   * Stage all changes
   * @returns {Promise<boolean>} Success status
   */
  async stageAll() {
    if (!await this.hasGitRepo()) {
      return false;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      // Get all changed files
      const changedFiles = await this.getChangedFiles();

      // Stage each file
      for (const file of changedFiles) {
        if (file.status !== 'deleted') {
          await this.git.add({ fs, dir, filepath: file.filepath });
        } else {
          await this.git.remove({ fs, dir, filepath: file.filepath });
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to stage files:', error);
      return false;
    }
  },

  /**
   * Commit changes to the repository
   * @param {string} message - Commit message
   * @returns {Promise<string|null>} Commit SHA or null
   */
  async commit(message = 'Update project') {
    if (!this.githubOAuth?.isAuthenticated()) {
      events.dispatch('git:error', { message: 'GitHub authentication required' });
      return null;
    }

    if (!await this.hasGitRepo()) {
      events.dispatch('git:error', { message: 'No git repository found. Initialize a repo first.' });
      return null;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      // Get current branch
      const branch = await this.git.currentBranch({ fs, dir, fullname: false });

      // Stage all changes
      await this.stageAll();

      // Check if there are changes to commit
      const changedFiles = await this.getChangedFiles();
      const hasStagedChanges = changedFiles.some(f => f.status === 'staged');

      if (!hasStagedChanges && changedFiles.length === 0) {
        events.dispatch('git:info', { message: 'No changes to commit' });
        return null;
      }

      // Commit
      const commitResult = await this.git.commit({
        fs,
        dir,
        message,
        author: { name: 'BRT CODE', email: 'user@brtcode.dev' }
      });

      this.currentStatus = SYNC_STATUS.CHANGES_TO_PUSH;
      events.dispatch('git:committed', {
        message,
        sha: commitResult,
        branch,
        date: new Date().toISOString()
      });
      events.dispatch('git:statusChanged', { status: this.currentStatus });

      return commitResult;
    } catch (error) {
      console.error('Failed to commit:', error);
      events.dispatch('git:error', { message: error.message });
      return null;
    }
  },

  /**
   * Push changes to GitHub
   * @returns {Promise<boolean>} Success status
   */
  async push() {
    if (!this.githubOAuth?.isAuthenticated()) {
      events.dispatch('git:error', { message: 'GitHub authentication required' });
      return false;
    }

    if (!await this.hasGitRepo()) {
      events.dispatch('git:error', { message: 'No git repository found' });
      return false;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;
      const token = this.githubOAuth.token || get('github.token');

      // Get current branch
      const branch = await this.git.currentBranch({ fs, dir, fullname: false });

      // Push to remote
      await this.git.push({
        fs,
        http: { request: fetch },
        dir,
        remote: 'origin',
        ref: branch,
        onAuth: () => ({ username: token })
      });

      this.currentStatus = SYNC_STATUS.SYNCED;
      events.dispatch('git:pushed', { branch, remote: 'origin' });
      events.dispatch('git:statusChanged', { status: this.currentStatus });

      return true;
    } catch (error) {
      console.error('Failed to push:', error);

      // Check if it's a non-fast-forward error
      if (error.message?.includes('not-fast-forward')) {
        this.currentStatus = SYNC_STATUS.BEHIND_REMOTE;
        events.dispatch('git:error', { message: 'Remote has changes. Pull first.' });
      } else {
        events.dispatch('git:error', { message: error.message });
      }

      events.dispatch('git:statusChanged', { status: this.currentStatus });
      return false;
    }
  },

  /**
   * Pull changes from GitHub
   * @returns {Promise<boolean>} Success status
   */
  async pull() {
    if (!this.githubOAuth?.isAuthenticated()) {
      events.dispatch('git:error', { message: 'GitHub authentication required' });
      return false;
    }

    if (!await this.hasGitRepo()) {
      events.dispatch('git:error', { message: 'No git repository found' });
      return false;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;
      const token = this.githubOAuth.token || get('github.token');

      // Get current branch
      const branch = await this.git.currentBranch({ fs, dir, fullname: false });

      // Pull from remote
      const pullResult = await this.git.pull({
        fs,
        http: { request: fetch },
        dir,
        remote: 'origin',
        ref: branch,
        onAuth: () => ({ username: token }),
        fastForwardOnly: false
      });

      // Check for conflicts in pull result
      if (pullResult.errors && pullResult.errors.length > 0) {
        this.currentStatus = SYNC_STATUS.CONFLICT;
        
        // Extract conflicting file paths from errors
        const conflictingFiles = await this.getConflictingFiles();
        events.dispatch('git:conflict', { 
          files: conflictingFiles.length > 0 ? conflictingFiles : pullResult.errors,
          message: 'Merge conflicts detected'
        });
        events.dispatch('git:statusChanged', { status: this.currentStatus });
        return false;
      }

      this.currentStatus = SYNC_STATUS.SYNCED;
      events.dispatch('git:pulled', { branch, commits: pullResult.commits });
      events.dispatch('git:statusChanged', { status: this.currentStatus });

      return true;
    } catch (error) {
      console.error('Failed to pull:', error);

      // Check for merge conflicts
      if (error.message?.includes('merge conflict') || error.message?.includes('conflict')) {
        this.currentStatus = SYNC_STATUS.CONFLICT;
        
        // Get list of conflicting files
        const conflictingFiles = await this.getConflictingFiles();
        events.dispatch('git:conflict', { 
          files: conflictingFiles,
          message: error.message 
        });
      } else {
        events.dispatch('git:error', { message: error.message });
      }

      events.dispatch('git:statusChanged', { status: this.currentStatus });
      return false;
    }
  },

  /**
   * Get list of files with merge conflicts
   * @returns {Promise<Array>} Array of conflicting file paths
   */
  async getConflictingFiles() {
    try {
      const fs = this.fs;
      const dir = this.dir;
      
      // Get status matrix to find files with conflicts
      const status = await this.git.statusMatrix({ fs, dir });
      
      // Files with conflicts typically show up with specific status patterns
      // Filter for files that have merge conflicts
      const conflictingFiles = status
        .filter(([filepath, headStatus, workdirStatus, stageStatus]) => {
          // Conflict patterns:
          // Both local and remote modified: [2, 2, 2] or similar
          // Or check for files that have conflict markers in content
          return workdirStatus === 2; // Modified in workdir (potential conflict)
        })
        .map(([filepath]) => filepath);
      
      // If no files found via status matrix, scan for files with conflict markers
      if (conflictingFiles.length === 0) {
        // Try to scan common source files for conflict markers
        const commonExtensions = ['.js', '.html', '.css', '.json', '.md'];
        for (const [filepath] of status) {
          if (commonExtensions.some(ext => filepath.endsWith(ext))) {
            try {
              const content = await fs.readFile(`${dir}/${filepath}`, 'utf8');
              if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
                conflictingFiles.push(filepath);
              }
            } catch (e) {
              // File might not exist or not be readable
            }
          }
        }
      }
      
      return conflictingFiles;
    } catch (error) {
      console.error('Failed to get conflicting files:', error);
      return [];
    }
  },

  /**
   * Check repository sync status
   * @returns {Promise<Object>} Status information
   */
  async checkStatus() {
    if (!await this.hasGitRepo()) {
      this.currentStatus = SYNC_STATUS.NOT_INITIALIZED;
      events.dispatch('git:statusChanged', { status: this.currentStatus });
      return { status: this.currentStatus };
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      // Get current branch
      const branch = await this.git.currentBranch({ fs, dir, fullname: false });

      // Get changed files
      const changedFiles = await this.getChangedFiles();
      const hasLocalChanges = changedFiles.length > 0;

      // Check remote status if authenticated
      let ahead = 0;
      let behind = 0;

      if (this.githubOAuth?.isAuthenticated()) {
        try {
          // Try to get remote status
          await this.git.fetch({
            fs,
            http: { request: fetch },
            dir,
            remote: 'origin',
            ref: branch,
            onAuth: () => ({ username: this.githubOAuth.token })
          });

          // Check ahead/behind
          const remoteCommit = await this.git.resolveRef({
            fs,
            dir,
            ref: `origin/${branch}`
          }).catch(() => null);

          const localCommit = await this.git.resolveRef({ fs, dir, ref: branch });

          if (remoteCommit && remoteCommit !== localCommit) {
            // Simple check - in production would calculate actual ahead/behind
            behind = 1; // Assume behind if refs differ
          }
        } catch (e) {
          // Remote might not exist yet
        }
      }

      // Determine status
      if (hasLocalChanges) {
        this.currentStatus = SYNC_STATUS.CHANGES_TO_PUSH;
      } else if (behind > 0) {
        this.currentStatus = SYNC_STATUS.BEHIND_REMOTE;
      } else {
        this.currentStatus = SYNC_STATUS.SYNCED;
      }

      const status = {
        status: this.currentStatus,
        branch,
        changedFiles,
        hasLocalChanges,
        ahead,
        behind
      };

      events.dispatch('git:status', { status });
      events.dispatch('git:statusChanged', { status: this.currentStatus });

      return status;
    } catch (error) {
      console.error('Failed to get status:', error);
      this.currentStatus = SYNC_STATUS.ERROR;
      events.dispatch('git:error', { message: error.message });
      events.dispatch('git:statusChanged', { status: this.currentStatus });
      return { status: this.currentStatus, error: error.message };
    }
  },

  /**
   * Get current sync status
   * @returns {string} Current sync status
   */
  getStatus() {
    return this.currentStatus;
  },

  /**
   * Resolve a git conflict
   * @param {string} filePath - Path to the conflicting file
   * @param {string} resolution - Resolution choice ('local', 'remote', or 'manual')
   * @param {string} content - Optional content for manual resolution
   * @returns {Promise<boolean>} Success status
   */
  async resolveConflict(filePath, resolution, content) {
    if (!filePath) {
      events.dispatch('git:error', { message: 'No file specified' });
      return false;
    }

    try {
      const fs = this.fs;
      const dir = this.dir;

      if (resolution === 'local') {
        // Keep local version - just stage it
        await this.git.add({ fs, dir, filepath: filePath });
      } else if (resolution === 'remote') {
        // Checkout remote version from HEAD
        // Remove conflict markers and restore to HEAD version
        await this.git.checkout({ fs, dir, filepaths: [filePath] });
        await this.git.add({ fs, dir, filepath: filePath });
      } else if (resolution === 'manual') {
        // Write the provided merged content
        if (content !== undefined) {
          await fs.writeFile(`${dir}/${filePath}`, content);
          await this.git.add({ fs, dir, filepath: filePath });
        } else {
          events.dispatch('git:error', { message: 'No content provided for manual resolution' });
          return false;
        }
      }

      events.dispatch('git:conflictResolved', {
        file: filePath,
        resolution
      });

      // Check if all conflicts resolved by checking for remaining conflict markers
      const conflictingFiles = await this.getConflictingFiles();
      if (conflictingFiles.length === 0) {
        this.currentStatus = SYNC_STATUS.SYNCED;
        events.dispatch('git:allConflictsResolved');
        events.dispatch('git:statusChanged', { status: this.currentStatus });
      }

      return true;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      events.dispatch('git:error', { message: error.message });
      return false;
    }
  },

  /**
   * Sync workflow: commit and push
   * @param {string} message - Commit message
   * @returns {Promise<boolean>} Success status
   */
  async sync(message) {
    // First commit
    const commitSha = await this.commit(message);
    if (!commitSha) {
      // No commit needed or commit failed
      const changedFiles = await this.getChangedFiles();
      if (changedFiles.length === 0) {
        // No changes to commit, try push anyway
      } else {
        return false;
      }
    }

    // Then push
    return await this.push();
  },

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopStatusPolling();
    if (this.statusDebounceTimer) {
      clearTimeout(this.statusDebounceTimer);
    }
  }
};

export default GitOperations;
