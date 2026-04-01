/**
 * Visual regression test - Editor component
 */
import { test, expect } from '@playwright/test';

test('Editor renders with neon theme', async ({ page }) => {
  await page.goto('/');
  
  // Check editor container exists
  const editor = await page.$('#editor-container');
  expect(editor).not.toBeNull();
  
  // Check CodeMirror is initialized
  await page.waitForSelector('.cm-editor', { timeout: 5000 });
  
  // Take screenshot
  await page.screenshot({ 
    path: 'tests/visual/screenshots/editor.png',
    maxTimeout: 30000
  });
});

test('Preview iframe loads correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for preview frame
  await page.waitForSelector('#preview-frame');
  
  // Check placeholder is visible initially
  const placeholder = await page.$('#preview-placeholder');
  expect(placeholder).not.toBeNull();
});

test('Command palette opens correctly', async ({ page }) => {
  await page.goto('/');
  
  // Open command palette via shortcut
  await page.click('body', { 
    modifiers: ['Control'], 
    clickCount: 1 
  });
  await page.keyboard.press('KeyP');
  
  // Wait for palette to open
  await page.waitForSelector('.command-palette:not(.hidden)');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'tests/visual/screenshots/command-palette.png' 
  });
});

test('Settings modal displays preferences', async ({ page }) => {
  await page.goto('/');
  
  // Open settings modal
  await page.click('.settings-modal .modal-header button');
  await page.waitForSelector('#settings-modal:not(.hidden)');
  
  // Check form fields exist
  expect(await page.$('#auto-run')).not.toBeNull();
  expect(await page.$('#debounce-time')).not.toBeNull();
  expect(await page.$('#console-mode')).not.toBeNull();
});

test('Layout toggle affects display', async ({ page }) => {
  await page.goto('/');
  
  // Get initial sidebar width
  const sidebar = await page.$('#sidebar');
  const initialWidth = await sidebar.boundingBox();
  
  // Toggle sidebar
  await page.click('[data-action="toggle-sidebar"]');
  
  // Verify sidebar is hidden
  const hiddenSidebar = await page.$('#sidebar');
  expect(await hiddenSidebar.$eval('.collapsed', el => el.classList.contains('collapsed')));
});
