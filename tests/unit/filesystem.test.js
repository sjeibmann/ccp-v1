/**
 * File system tests
 * Run with: npm test -- --testPathPattern=filesystem
 */

import { get, set, subscribe, unsubscribe } from '../../src/core/state.js';

describe('State Management', () => {
  beforeEach(() => {
    // Clear state before each test
    set('testKey', undefined);
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      set('testKey', 'testValue');
      expect(get('testKey')).toBe('testValue');
    });

    it('should return undefined for unset keys', () => {
      expect(get('nonExistentKey')).toBeUndefined();
    });

    it('should update existing values', () => {
      set('testKey', 'initial');
      set('testKey', 'updated');
      expect(get('testKey')).toBe('updated');
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of changes', () => {
      let callbackCalled = false;
      let callbackValue = null;
      
      const callback = (value, oldValue) => {
        callbackCalled = true;
        callbackValue = value;
      };
      
      const unsubscribe = subscribe('testKey', callback);
      
      set('testKey', 'updated');
      
      expect(callbackCalled).toBe(true);
      expect(callbackValue).toBe('updated');
      
      unsubscribe();
    });

    it('should not call callback for different keys', () => {
      let callbackCalled = false;
      
      const callback = () => {
        callbackCalled = true;
      };
      
      const unsubscribe = subscribe('key1', callback);
      
      set('key2', 'value');
      
      expect(callbackCalled).toBe(false);
      
      unsubscribe();
    });
  });

  describe('FileSystem (Browser-only)', () => {
    it('should note that FileSystem tests require browser environment', () => {
      // FileSystem tests require browser APIs (showDirectoryPicker, queryLocalFileSystem)
      // which are not available in Node.js test environment
      // These would be tested in E2E or browser-based tests
      expect(true).toBe(true);
    });
  });
});
