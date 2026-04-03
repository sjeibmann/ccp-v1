/**
 * Visual regression test - Editor component
 * Tests the BRT CODE theme appearance
 */
import { test, expect } from '@playwright/test';

test('Editor renders with BRT CODE theme', async ({ page }) => {
  await page.goto('/');
  
  // Check editor container exists
  const editor = await page.$('#editor');
  expect(editor).not.toBeNull();
  
  // Check CodeMirror is initialized
  await page.waitForSelector('.cm-editor', { timeout: 5000 });
  
  // Verify BRT CODE theme is applied (dark navy background)
  const editorElement = await page.locator('.cm-editor');
  await expect(editorElement).toBeVisible();
  
  // Take screenshot for visual regression
  await expect(editorElement).toHaveScreenshot('editor-brt-code.png');
});

test('Preview iframe loads correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for preview frame
  await page.waitForSelector('#preview iframe, #preview-frame');
  
  // Check preview container is visible
  const preview = await page.$('#preview');
  expect(preview).not.toBeNull();
  
  // Take screenshot of preview area
  const previewElement = page.locator('#preview');
  await expect(previewElement).toBeVisible();
  await expect(previewElement).toHaveScreenshot('preview-area.png');
});

test('Command palette opens correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for app to be ready
  await page.waitForSelector('.cm-editor', { timeout: 5000 });
  
  // Open command palette via keyboard shortcut
  await page.keyboard.press('Control+p');
  
  // Wait for palette to open
  const commandPalette = page.locator('#command-palette');
  await expect(commandPalette).toBeVisible();
  
  // Take screenshot
  await expect(commandPalette).toHaveScreenshot('command-palette.png');
});

test('Settings modal displays preferences', async ({ page }) => {
  await page.goto('/');
  
  // Wait for app to be ready
  await page.waitForSelector('.cm-editor', { timeout: 5000 });
  
  // Open settings via command palette or button
  const settingsButton = page.locator('[data-action="open-settings"], #settings-btn').first();
  const hasSettingsButton = await settingsButton.isVisible().catch(() => false);
  
  if (hasSettingsButton) {
    await settingsButton.click();
  } else {
    // Try keyboard shortcut
    await page.keyboard.press('Control+Shift+p');
  }
  
  // Look for settings modal
  const settingsModal = page.locator('#settings-modal, .settings-modal');
  await expect(settingsModal).toBeVisible();
  
  // Take screenshot
  await expect(settingsModal).toHaveScreenshot('settings-modal.png');
});

test('Layout toggle affects display', async ({ page }) => {
  await page.goto('/');
  
  // Wait for app to be ready
  await page.waitForSelector('.cm-editor', { timeout: 5000 });
  
  // Get initial state
  await expect(page.locator('#sidebar, .sidebar')).toHaveScreenshot('layout-sidebar-visible.png');
  
  // Toggle sidebar
  const toggleButton = page.locator('[data-action="toggle-sidebar"], #sidebar-toggle').first();
  const hasToggle = await toggleButton.isVisible().catch(() => false);
  
  if (hasToggle) {
    await toggleButton.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#sidebar, .sidebar')).toHaveScreenshot('layout-sidebar-hidden.png');
  }
});
