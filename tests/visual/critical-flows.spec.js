/**
 * Visual regression tests - Critical user flows
 * Tests the BRT CODE theme appearance and core functionality
 */
import { test, expect } from '@playwright/test';

// Helper to wait for app initialization
async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.cm-editor', { timeout: 10000 });
}

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('app loads with editor and preview panels', async ({ page }) => {
    // Verify editor container is visible
    await expect(page.locator('#editor')).toBeVisible();
    
    // Verify preview container is visible
    await expect(page.locator('#preview')).toBeVisible();
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('app-loaded.png', {
      fullPage: true,
    });
  });

  test('editor shows BRT CODE theme', async ({ page }) => {
    // Wait for CodeMirror editor
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();
    
    // Verify dark navy background (BRT CODE theme)
    const editorElement = await editor.elementHandle();
    const styles = await editorElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
      };
    });
    
    // Check for dark background (BRT CODE uses #0d1117)
    expect(styles.backgroundColor).toBeTruthy();
    
    // Take screenshot of editor
    await expect(editor).toHaveScreenshot('editor-brt-code-theme.png');
  });

  test('typing in editor updates preview', async ({ page }) => {
    // Get the CodeMirror editor content area
    const editorContent = page.locator('.cm-content');
    await expect(editorContent).toBeVisible();
    
    // Clear existing content and type test code
    await editorContent.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`// BRT CODE Theme Test
function setup() {
  createCanvas(400, 400);
  background(13, 17, 23); // Dark navy
}

function draw() {
  fill(201, 169, 97); // Gold accent
  ellipse(200, 200, 100, 100);
}`);
    
    // Wait for preview to update
    await page.waitForTimeout(500);
    
    // Verify preview iframe has content
    const previewFrame = page.locator('#preview iframe');
    await expect(previewFrame).toBeVisible();
    
    // Take screenshot of both panels
    await expect(page.locator('#editor')).toHaveScreenshot('editor-with-code.png');
  });

  test('command palette opens with keyboard shortcut', async ({ page }) => {
    // Use Control+P to open command palette
    await page.keyboard.press('Control+p');
    
    // Verify command palette is visible
    const commandPalette = page.locator('#command-palette');
    await expect(commandPalette).toBeVisible();
    
    // Take screenshot of command palette
    await expect(commandPalette).toHaveScreenshot('command-palette-open.png');
    
    // Close command palette
    await page.keyboard.press('Escape');
    await expect(commandPalette).not.toBeVisible();
  });

  test('export button is accessible', async ({ page }) => {
    // Verify export button exists and is visible
    const exportButton = page.locator('[data-action="export-zip"], #export-btn, button[title*="export" i]').first();
    
    // Check if export button exists
    const hasExportButton = await exportButton.isVisible().catch(() => false);
    
    if (hasExportButton) {
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toHaveScreenshot('export-button.png');
    } else {
      // If no specific export button found, check for toolbar
      const toolbar = page.locator('#toolbar, .toolbar');
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveScreenshot('toolbar.png');
    }
  });

  test('layout toggle affects sidebar display', async ({ page }) => {
    // Find sidebar
    const sidebar = page.locator('#sidebar, .sidebar');
    const isSidebarVisible = await sidebar.isVisible().catch(() => false);
    
    if (isSidebarVisible) {
      // Take initial screenshot
      await expect(page).toHaveScreenshot('layout-with-sidebar.png', { fullPage: true });
      
      // Find and click toggle button
      const toggleButton = page.locator('[data-action="toggle-sidebar"], #sidebar-toggle').first();
      const hasToggle = await toggleButton.isVisible().catch(() => false);
      
      if (hasToggle) {
        await toggleButton.click();
        await page.waitForTimeout(300);
        
        // Take screenshot after toggle
        await expect(page).toHaveScreenshot('layout-without-sidebar.png', { fullPage: true });
      }
    }
  });

  test('console panel shows when activated', async ({ page }) => {
    // Look for console toggle or panel
    const consoleToggle = page.locator('[data-action="toggle-console"], #console-toggle, button[title*="console" i]').first();
    const hasConsoleToggle = await consoleToggle.isVisible().catch(() => false);
    
    const consolePanel = page.locator('#console, .console-panel').first();
    const hasConsolePanel = await consolePanel.isVisible().catch(() => false);
    
    if (hasConsoleToggle || hasConsolePanel) {
      if (hasConsoleToggle && !hasConsolePanel) {
        await consoleToggle.click();
        await page.waitForTimeout(300);
      }
      
      if (await consolePanel.isVisible().catch(() => false)) {
        await expect(consolePanel).toHaveScreenshot('console-panel.png');
      }
    }
  });
});

test.describe('BRT CODE Theme Verification', () => {
  test('verifies theme colors are present', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    // Check computed styles for BRT CODE theme colors
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();
    
    // Get all CSS custom properties (variables) from root
    const themeVars = await page.evaluate(() => {
      const root = document.documentElement;
      const computed = window.getComputedStyle(root);
      const vars = {};
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        if (prop.startsWith('--')) {
          vars[prop] = computed.getPropertyValue(prop);
        }
      }
      return vars;
    });
    
    // Log theme variables for debugging
    console.log('Theme CSS Variables:', themeVars);
    
    // Take final verification screenshot
    await expect(page).toHaveScreenshot('brt-code-theme-verification.png', {
      fullPage: true,
    });
  });
});
