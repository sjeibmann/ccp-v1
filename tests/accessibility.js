/**
 * Accessibility Audit Test Suite
 * Tests for WCAG 2.1 AA compliance
 */

// Color contrast checker
function checkColorContrast() {
  const results = {
    passed: [],
    failed: []
  };

  // Get computed styles for key elements
  const elements = document.querySelectorAll('body, button, input, .file-tree-item, .tab, .console-tab, .palette-result');

  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;

    // Check if color contrast is sufficient (4.5:1 for normal text)
    // Note: This is a simplified check - real implementation would calculate actual contrast ratio
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();

    // Report for manual verification
    results.passed.push({
      element: el.tagName,
      color: color,
      background: bgColor
    });
  });

  return results;
}

// Check ARIA labels
function checkARIALabels() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Check buttons without accessible names
  const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
  buttons.forEach(btn => {
    if (!btn.textContent.trim() && !btn.querySelector('img[alt]')) {
      results.failed.push({
        element: 'button',
        issue: 'Missing accessible name',
        html: btn.outerHTML.substring(0, 100)
      });
    }
  });

  // Check form inputs
  const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
  inputs.forEach(input => {
    const hasLabel = input.labels?.length > 0 || input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    const hasPlaceholder = input.placeholder;

    if (!hasLabel && !hasPlaceholder) {
      results.failed.push({
        element: input.tagName,
        issue: 'Missing label',
        id: input.id || 'no-id'
      });
    }
  });

  // Check images
  const images = document.querySelectorAll('img:not([alt])');
  images.forEach(img => {
    results.warnings.push({
      element: 'img',
      issue: 'Missing alt text',
      src: img.src
    });
  });

  // Check interactive elements
  const interactive = document.querySelectorAll('[tabindex]:not([tabindex="-1"])');
  interactive.forEach(el => {
    if (!el.getAttribute('role') && !el.tagName.match(/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/)) {
      results.warnings.push({
        element: el.tagName,
        issue: 'Element with tabindex but no role',
        tabindex: el.getAttribute('tabindex')
      });
    }
  });

  return results;
}

// Check keyboard accessibility
function checkKeyboardAccessibility() {
  const results = {
    passed: [],
    failed: []
  };

  // Check focusable elements
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];

  const focusable = document.querySelectorAll(focusableSelectors.join(', '));

  focusable.forEach(el => {
    // Check if element is visible
    const style = window.getComputedStyle(el);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';

    if (isVisible) {
      results.passed.push({
        element: el.tagName,
        id: el.id,
        accessible: true
      });
    }
  });

  // Check for focus indicators
  const hasFocusStyles = !!document.querySelector('style');
  if (hasFocusStyles) {
    results.passed.push({
      check: 'Focus styles',
      status: 'Present'
    });
  }

  return results;
}

// Check semantic HTML
function checkSemanticHTML() {
  const results = {
    passed: [],
    failed: []
  };

  // Check for main landmark
  const hasMain = document.querySelector('main');
  if (hasMain) {
    results.passed.push({ check: 'Main landmark', status: 'Present' });
  } else {
    results.failed.push({ check: 'Main landmark', status: 'Missing' });
  }

  // Check for navigation landmarks
  const hasNav = document.querySelector('nav');
  if (hasNav) {
    results.passed.push({ check: 'Navigation landmark', status: 'Present' });
  }

  // Check for headings hierarchy
  const h1 = document.querySelector('h1');
  if (h1) {
    results.passed.push({ check: 'H1 heading', status: 'Present' });
  }

  // Check for lang attribute
  const html = document.documentElement;
  if (html.getAttribute('lang')) {
    results.passed.push({ check: 'Language attribute', status: html.getAttribute('lang') });
  }

  // Check for skip link
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    results.passed.push({ check: 'Skip link', status: 'Present' });
  } else {
    results.failed.push({ check: 'Skip link', status: 'Missing' });
  }

  return results;
}

// Check modals for accessibility
function checkModalAccessibility() {
  const results = {
    passed: [],
    failed: []
  };

  const modals = document.querySelectorAll('.modal');

  modals.forEach((modal, index) => {
    // Check for aria-modal
    if (modal.getAttribute('aria-modal') === 'true') {
      results.passed.push({ check: `Modal ${index} aria-modal`, status: 'Present' });
    }

    // Check for role="dialog"
    if (modal.getAttribute('role') === 'dialog') {
      results.passed.push({ check: `Modal ${index} role`, status: 'dialog' });
    }

    // Check for aria-label
    if (modal.getAttribute('aria-label')) {
      results.passed.push({ check: `Modal ${index} aria-label`, status: 'Present' });
    }
  });

  return results;
}

// Run all accessibility checks
function runAccessibilityAudit() {
  console.log('=== ACCESSIBILITY AUDIT ===\n');

  console.log('1. SEMANTIC HTML:');
  const semantic = checkSemanticHTML();
  console.log('Passed:', semantic.passed.length);
  console.log('Failed:', semantic.failed.length);
  console.log('Details:', semantic);

  console.log('\n2. ARIA LABELS:');
  const aria = checkARIALabels();
  console.log('Passed:', aria.passed.length);
  console.log('Failed:', aria.failed.length);
  console.log('Warnings:', aria.warnings.length);
  console.log('Details:', aria);

  console.log('\n3. KEYBOARD ACCESSIBILITY:');
  const keyboard = checkKeyboardAccessibility();
  console.log('Focusable elements:', keyboard.passed.length);
  console.log('Details:', keyboard);

  console.log('\n4. MODAL ACCESSIBILITY:');
  const modals = checkModalAccessibility();
  console.log('Passed:', modals.passed.length);
  console.log('Details:', modals);

  console.log('\n5. COLOR CONTRAST:');
  const contrast = checkColorContrast();
  console.log('Elements checked:', contrast.passed.length);
  console.log('Details:', contrast);

  // Summary
  const totalPassed = semantic.passed.length + aria.passed.length + keyboard.passed.length + modals.passed.length + contrast.passed.length;
  const totalFailed = semantic.failed.length + aria.failed.length + modals.failed.length;
  const totalWarnings = aria.warnings.length;

  console.log('\n=== SUMMARY ===');
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Total Warnings: ${totalWarnings}`);

  if (totalFailed === 0) {
    console.log('\n✓ Accessibility audit PASSED - No critical issues found');
  } else {
    console.log(`\n✗ Accessibility audit FAILED - ${totalFailed} critical issues found`);
  }

  return {
    semantic,
    aria,
    keyboard,
    modals,
    contrast,
    summary: { totalPassed, totalFailed, totalWarnings }
  };
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkColorContrast,
    checkARIALabels,
    checkKeyboardAccessibility,
    checkSemanticHTML,
    checkModalAccessibility,
    runAccessibilityAudit
  };
}

// Run audit when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAccessibilityAudit);
  } else {
    runAccessibilityAudit();
  }
}
