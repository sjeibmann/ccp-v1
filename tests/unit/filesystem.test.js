/**
 * File system tests
 * Run with: npm test -- --testPathPattern=filesystem
 */

import FileSystem from '../modules/filesystem/filesystem.js';
import { get, set } from '../core/state.js';

describe('FileSystem', () => {
  describe('isSupported', () => {
    it('should check if File System Access API is supported', () => {
      expect(FileSystem.isSupported()).toBe(true);
    });
  });

  describe('getFileInfo', () => {
    it('should return file metadata', async () => {
      // Test file info retrieval
      // This is just a placeholder test for the API contract
    });
  });
});

// State module tests
describe('State Management', () => {
  describe('get/set', () => {
    it('should store and retrieve values', () => {
      set('testKey', 'testValue');
      expect(get('testKey')).toBe('testValue');
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of changes', () => {
      let invoked = false;
      const unsubscribe = State.subscribe('test', (value) => {
        if (value === 'updated') {
          invoked = true;
        }
      });
      
      State.set('test', 'updated');
      expect(invoked).toBe(true);
      
      unsubscribe();
    });
  });
});
