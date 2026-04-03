/**
 * GitHub OAuth Module
 * Handles GitHub authentication using PKCE flow with popup
 */
import { get, set, subscribe } from '../core/state.js';
import { events } from '../core/events.js';

const GitHubOAuth = {
  name: 'github',
  clientId: null,
  redirectUri: null,
  token: null,
  user: null,
  popup: null,
  codeVerifier: null,
  
  // GitHub OAuth endpoints
  GITHUB_AUTH_URL: 'https://github.com/login/oauth/authorize',
  GITHUB_TOKEN_URL: 'https://github.com/login/oauth/access_token',
  GITHUB_API_URL: 'https://api.github.com',
  
  /**
   * Initialize GitHub OAuth
   */
  async init() {
    console.log('Initializing GitHub OAuth module...');
    
    this.clientId = get('github.clientId') || 'YOUR_GITHUB_CLIENT_ID';
    this.redirectUri = get('github.redirectUri') || `${window.location.origin}/oauth/callback`;
    
    // Restore token from state if exists (but not localStorage for security)
    const savedToken = get('github.token');
    if (savedToken) {
      this.token = savedToken;
      // Verify token is still valid
      try {
        const user = await this.getUserInfo();
        set('github.user', user);
        set('github.authenticated', true);
        events.dispatch('github:authenticated', { token: this.token, user });
      } catch (error) {
        console.log('Token expired or invalid, clearing...');
        this.logout();
      }
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Listen for auth changes
    subscribe('github.authenticated', (isAuthenticated) => {
      this.updateUI(isAuthenticated);
    });
    
    console.log('GitHub OAuth module initialized');
    return this;
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for messages from popup
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'github:oauth:success') {
        this.handleOAuthSuccess(event.data.code, event.data.state);
      } else if (event.data.type === 'github:oauth:error') {
        this.handleOAuthError(event.data.error);
      }
    });
    
    // Event handlers
    events.on('github:authenticate', () => this.authenticate());
    events.on('github:logout', () => this.logout());
    events.on('github:checkAuth', () => {
      const isAuth = this.isAuthenticated();
      events.dispatch('github:authChecked', { authenticated: isAuth });
    });
  },
  
  /**
   * Generate PKCE code verifier
   * @returns {string} Code verifier
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  },
  
  /**
   * Generate PKCE code challenge from verifier
   * @param {string} verifier - Code verifier
   * @returns {Promise<string>} Code challenge
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  },
  
  /**
   * Base64 URL encode
   * @param {ArrayBuffer|Uint8Array} buffer - Buffer to encode
   * @returns {string} Base64 URL encoded string
   */
  base64URLEncode(buffer) {
    const bytes = Array.from(new Uint8Array(buffer));
    const base64 = btoa(String.fromCharCode.apply(null, bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },
  
  /**
   * Generate random state for CSRF protection
   * @returns {string} Random state string
   */
  generateState() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return this.base64URLEncode(array);
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
   * Authenticate with GitHub using OAuth popup
   */
  async authenticate() {
    if (!this.clientId || this.clientId === 'YOUR_GITHUB_CLIENT_ID') {
      console.error('GitHub OAuth client ID not configured');
      events.dispatch('github:error', { 
        message: 'GitHub Client ID not configured. Please set github.clientId in settings.' 
      });
      return;
    }
    
    // Close any existing popup
    if (this.popup && !this.popup.closed) {
      this.popup.close();
    }
    
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
    const state = this.generateState();
    
    // Store state and code verifier
    set('github.state', state);
    set('github.codeVerifier', this.codeVerifier);
    
    // Build authorization URL with PKCE
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: 'repo user',
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    const authorizationUrl = `${this.GITHUB_AUTH_URL}?${params.toString()}`;
    
    // Open popup window
    const width = 500;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    this.popup = window.open(
      authorizationUrl,
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
    
    // Check if popup was blocked
    if (!this.popup || this.popup.closed) {
      events.dispatch('github:error', { 
        message: 'Popup blocked. Please allow popups for this site.' 
      });
      return;
    }
    
    // Poll for popup close
    const checkPopup = setInterval(() => {
      if (this.popup && this.popup.closed) {
        clearInterval(checkPopup);
        // If token wasn't set, authentication was cancelled
        if (!this.token) {
          events.dispatch('github:cancelled');
        }
      }
    }, 500);
    
    events.dispatch('github:authenticating');
  },
  
  /**
   * Handle OAuth callback from popup
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   */
  async handleCallback(code, state) {
    const savedState = get('github.state');
    const codeVerifier = get('github.codeVerifier');
    
    if (state !== savedState) {
      console.error('State mismatch - possible CSRF attack');
      events.dispatch('github:error', { message: 'Authentication failed (state mismatch)' });
      return;
    }
    
    try {
      // Exchange code for token with PKCE
      const response = await this.exchangeCodeForToken(code, codeVerifier);
      
      if (response.access_token) {
        this.token = response.access_token;
        set('github.token', this.token);
        set('github.authenticated', true);
        
        // Get user info
        const user = await this.getUserInfo();
        this.user = user;
        set('github.user', user);
        
        // Close popup if still open
        if (this.popup && !this.popup.closed) {
          this.popup.close();
        }
        
        events.dispatch('github:authenticated', { token: this.token, user });
        console.log('GitHub authentication successful:', user.login);
      } else {
        const error = response.error_description || response.error || 'Failed to get access token';
        events.dispatch('github:error', { message: error });
      }
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      events.dispatch('github:error', { message: error.message });
    }
  },
  
  /**
   * Handle OAuth success from popup message
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   */
  async handleOAuthSuccess(code, state) {
    await this.handleCallback(code, state);
  },
  
  /**
   * Handle OAuth error from popup
   * @param {string} error - Error message
   */
  handleOAuthError(error) {
    console.error('OAuth error:', error);
    events.dispatch('github:error', { message: error });
  },
  
  /**
   * Exchange authorization code for access token with PKCE
   * @param {string} code - Authorization code
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      // For GitHub OAuth with PKCE, we need a backend or use a proxy
      // In production, you would have a backend endpoint to exchange the code
      // For this implementation, we'll show the expected structure
      
      // Note: GitHub OAuth requires client_secret which should NOT be in frontend
      // This should be handled by a backend service
      
      // For demo/MVP purposes, we'll simulate a successful response
      // In production, replace with actual backend call:
      // const response = await fetch('/api/github/token', { ... });
      
      // Simulated response for MVP
      if (this.clientId === 'YOUR_GITHUB_CLIENT_ID') {
        // Mock token for development
        console.log('Using mock token for development');
        return {
          access_token: 'mock_github_token_' + Date.now(),
          token_type: 'bearer',
          scope: 'repo,user'
        };
      }
      
      // Real implementation would be:
      const response = await fetch(this.GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          code: code,
          redirect_uri: this.redirectUri,
          state: get('github.state'),
          code_verifier: codeVerifier
        })
      });
      
      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }
      
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
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    try {
      const response = await fetch(`${this.GITHUB_API_URL}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.status === 401) {
        // Token expired
        this.logout();
        throw new Error('Token expired. Please log in again.');
      }
      
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
  isAuthenticated() {
    return !!this.token && !!get('github.authenticated');
  },
  
  /**
   * Get current authentication status
   * @returns {Object} Auth status with user info if authenticated
   */
  getAuthStatus() {
    return {
      authenticated: this.isAuthenticated(),
      user: this.user || get('github.user'),
      token: this.token
    };
  },
  
  /**
   * Get current token
   * @returns {string|null} Current token
   */
  getToken() {
    return this.token;
  },
  
  /**
   * Get current user
   * @returns {Object|null} Current user
   */
  getUser() {
    return this.user || get('github.user');
  },
  
  /**
   * Logout from GitHub
   */
  logout() {
    this.token = null;
    this.user = null;
    this.codeVerifier = null;
    
    set('github.token', null);
    set('github.authenticated', false);
    set('github.user', null);
    set('github.state', null);
    set('github.codeVerifier', null);
    
    events.dispatch('github:logout');
    console.log('GitHub logged out');
  },
  
  /**
   * Update UI based on authentication state
   * @param {boolean} isAuthenticated - Whether user is authenticated
   */
  updateUI(isAuthenticated) {
    // Dispatch event for components to update
    events.dispatch('github:uiUpdate', { authenticated: isAuthenticated });
  },
  
  /**
   * Make authenticated GitHub API request
   * @param {string} endpoint - API endpoint (e.g., '/user/repos')
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} API response
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Please log in first.');
    }
    
    const url = `${this.GITHUB_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      this.logout();
      throw new Error('Authentication expired. Please log in again.');
    }
    
    return response;
  },
  
  /**
   * Get user repositories
   * @returns {Promise<Array>} User repositories
   */
  async getUserRepos() {
    const response = await this.apiRequest('/user/repos?sort=updated&per_page=100');
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    return await response.json();
  },
  
  /**
   * Create a new repository
   * @param {string} name - Repository name
   * @param {Object} options - Repository options
   * @returns {Promise<Object>} Created repository
   */
  async createRepo(name, options = {}) {
    const response = await this.apiRequest('/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: options.description || '',
        private: options.private || false,
        auto_init: options.autoInit || false
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create repository');
    }
    
    return await response.json();
  }
};

export default GitHubOAuth;
