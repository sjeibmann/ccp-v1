/**
 * GitHub OAuth Module
 * Handles GitHub authentication and integration
 */
import { get, set } from '../core/state.js';
import { events } from '../core/events.js';

const GitHubOAuth = {
  name: 'github',
  clientId: null,
  redirectUri: null,
  token: null,
  authWindow: null,
  
  /**
   * Initialize GitHub OAuth
   */
  async init() {
    console.log('Initializing GitHub OAuth module...');
    
    this.clientId = get('github.clientId') || 'YOUR_GITHUB_CLIENT_ID';
    this.redirectUri = get('github.redirectUri') || `${window.location.origin}/oauth/callback`;
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('GitHub OAuth module initialized');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    events.on('github:login', () => {
      this.login();
    });
    
    events.on('github:logout', () => {
      this.logout();
    });
    
    events.on('github:checkAuth', () => {
      this.checkAuthentication();
    });
  },
  
  /**
   * Initialize GitHub OAuth with client ID
   * @param {string} clientId - GitHub OAuth client ID
   * @param {string} redirectUri - Redirect URI
   */
  initAuth(clientId, redirectUri) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    set('github.clientId', clientId);
    set('github.redirectUri', redirectUri);
  },
  
  /**
   * Initiate GitHub OAuth login flow
   */
  login() {
    if (!this.clientId) {
      console.error('GitHub OAuth client ID not configured');
      events.dispatch('github:error', { message: 'Client ID not configured' });
      return;
    }
    
    // Generate state for CSRF protection
    const state = this.generateState();
    set('github.state', state);
    
    // Save redirect URI for callback
    set('github.redirectAfterAuth', window.location.hash || '#/');
    
    // Open GitHub authorization URL
    const authorizationUrl = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}&scope=repo,user`;
    
    // For PWA, use popup or redirect
    // Using redirect for simpler implementation
    window.location.href = authorizationUrl;
  },
  
  /**
   * Handle OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   */
  async handleCallback(code, state) {
    const savedState = get('github.state');
    
    if (state !== savedState) {
      console.error('State mismatch - possible CSRF attack');
      events.dispatch('github:error', { message: 'Authentication failed (state mismatch)' });
      return;
    }
    
    try {
      // Exchange code for token
      const response = await this.exchangeCodeForToken(code);
      
      if (response.access_token) {
        this.token = response.access_token;
        set('github.token', this.token);
        set('github.authenticated', true);
        
        // Get user info
        const user = await this.getUserInfo();
        set('github.user', user);
        
        events.dispatch('github:loginSuccess', { token: this.token, user });
      } else {
        events.dispatch('github:error', { message: 'Failed to get access token' });
      }
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      events.dispatch('github:error', { message: error.message });
    }
  },
  
  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: get('github.clientSecret') || '',
          code: code,
          redirect_uri: this.redirectUri,
          state: get('github.state')
        })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  },
  
  /**
   * Get GitHub user information
   * @returns {Promise<Object>} User data
   */
  async getUserInfo() {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  checkAuthentication() {
    const token = get('github.token');
    return !!token;
  },
  
  /**
   * Logout from GitHub
   */
  logout() {
    this.token = null;
    set('github.token', null);
    set('github.authenticated', false);
    set('github.user', null);
    
    events.dispatch('github:logout');
  },
  
  /**
   * Generate random state for CSRF protection
   * @returns {string} Random state string
   */
  generateState() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
  
  /**
   * Get authenticated status
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.checkAuthentication();
  },
  
  /**
   * Make authenticated GitHub API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} API response
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Please log in first.');
    }
    
    const url = `https://api.github.com${endpoint}`;
    
    return await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    });
  }
};

export default GitHubOAuth;
