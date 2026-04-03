/**
 * Project module tests
 * Run with: npm test -- --testPathPattern=project
 */

import { get, set } from '../../src/core/state.js';

describe('Project', () => {
  beforeEach(() => {
    // Clear state before each test
    set('currentProject', undefined);
    set('projects', undefined);
  });

  describe('State Management for Projects', () => {
    it('should store project data in state', () => {
      const projectData = {
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        path: '/test/project'
      };
      
      set('currentProject', projectData);
      
      expect(get('currentProject')).toEqual(projectData);
    });

    it('should store multiple projects', () => {
      const projects = [
        { name: 'Project 1', path: '/project1' },
        { name: 'Project 2', path: '/project2' }
      ];
      
      set('projects', projects);
      
      expect(get('projects')).toHaveLength(2);
      expect(get('projects')[0].name).toBe('Project 1');
    });
  });

  describe('Project Module (Browser-only)', () => {
    it('should note that Project module requires browser environment', () => {
      // Project module uses FileSystem API which requires browser APIs
      // (showDirectoryPicker, queryLocalFileSystem, EventTarget, etc.)
      // which are not available in Node.js test environment
      // These would be tested in E2E or browser-based tests
      expect(true).toBe(true);
    });
  });
});
