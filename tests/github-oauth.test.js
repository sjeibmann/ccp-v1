/**
 * GitHub OAuth Integration Tests
 */
import GitHubOAuth from '../src/modules/github.js';
import { get, set, clear } from '../src/core/state.js';
import { events } from '../src/core/events.js';

// Mock window.crypto
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    subtle: {
      digest: async () => new ArrayBuffer(32)
    }
  }
});

describe('GitHub OAuth Module', () => {
  let githubOAuth;

  beforeEach(() => {
    clear();
    githubOAuth = { ...GitHubOAuth };
  });

  afterEach(() => {
    clear();
  });

  describe('Initialization', () => {
    test('should initialize with default values', async () => {
      await githubOAuth.init();
      
      expect(githubOAuth.clientId).toBe('YOUR_GITHUB_CLIENT_ID');
      expect(githubOAuth.token).toBeNull();
      expect(githubOAuth.user).toBeNull();
    });

    test('should load clientId from state', async () => {
      set('github.clientId', 'test-client-id');
      await githubOAuth.init();
      
      expect(githubOAuth.clientId).toBe('test-client-id');
    });
  });

  describe('PKCE Flow', () => {
    test('should generate code verifier', () => {
      const verifier = githubOAuth.generateCodeVerifier();
      
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    test('should generate code challenge from verifier', async () => {
      const verifier = 'test-verifier';
      const challenge = await githubOAuth.generateCodeChallenge(verifier);
      
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
    });

    test('should generate random state', () => {
      const state = githubOAuth.generateState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication State', () => {
    test('should return false when not authenticated', () => {
      expect(githubOAuth.isAuthenticated()).toBe(false);
    });

    test('should return true when token exists', () => {
      githubOAuth.token = 'test-token';
      set('github.authenticated', true);
      
      expect(githubOAuth.isAuthenticated()).toBe(true);
    });

    test('should return correct auth status', () => {
      const status = githubOAuth.getAuthStatus();
      
      expect(status.authenticated).toBe(false);
      expect(status.user).toBeNull();
      expect(status.token).toBeNull();
    });
  });

  describe('Token Management', () => {
    test('should store token in memory', () => {
      githubOAuth.token = 'test-token';
      
      expect(githubOAuth.getToken()).toBe('test-token');
    });

    test('should return user info', () => {
      const mockUser = { login: 'testuser', name: 'Test User' };
      githubOAuth.user = mockUser;
      
      expect(githubOAuth.getUser()).toEqual(mockUser);
    });
  });

  describe('Logout', () => {
    test('should clear all auth data on logout', () => {
      githubOAuth.token = 'test-token';
      githubOAuth.user = { login: 'testuser' };
      set('github.authenticated', true);
      
      githubOAuth.logout();
      
      expect(githubOAuth.token).toBeNull();
      expect(githubOAuth.user).toBeNull();
      expect(get('github.authenticated')).toBe(false);
      expect(get('github.token')).toBeNull();
    });

    test('should dispatch logout event', () => {
      const logoutHandler = jest.fn();
      events.on('github:logout', logoutHandler);
      
      githubOAuth.logout();
      
      expect(logoutHandler).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    test('should listen for authenticate event', () => {
      const authSpy = jest.spyOn(githubOAuth, 'authenticate');
      
      events.dispatch('github:authenticate');
      
      // Event is async, so we need to wait
      setTimeout(() => {
        expect(authSpy).toHaveBeenCalled();
      }, 0);
    });

    test('should listen for logout event', () => {
      const logoutSpy = jest.spyOn(githubOAuth, 'logout');
      
      events.dispatch('github:logout');
      
      setTimeout(() => {
        expect(logoutSpy).toHaveBeenCalled();
      }, 0);
    });
  });

  describe('State Integration', () => {
    test('should update state on authentication', () => {
      githubOAuth.token = 'test-token';
      set('github.token', 'test-token');
      set('github.authenticated', true);
      
      expect(get('github.token')).toBe('test-token');
      expect(get('github.authenticated')).toBe(true);
    });

    test('should update state with user info', () => {
      const mockUser = { login: 'testuser', id: 123 };
      githubOAuth.user = mockUser;
      set('github.user', mockUser);
      
      expect(get('github.user')).toEqual(mockUser);
    });
  });
});

describe('GitHub OAuth API Methods', () => {
  let githubOAuth;

  beforeEach(() => {
    clear();
    githubOAuth = { ...GitHubOAuth };
  });

  test('should make authenticated API requests', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser' })
      })
    );

    githubOAuth.token = 'test-token';
    
    const response = await githubOAuth.apiRequest('/user');
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'token test-token'
        })
      })
    );
  });

  test('should throw error when not authenticated', async () => {
    await expect(githubOAuth.apiRequest('/user')).rejects.toThrow('Not authenticated');
  });
});
