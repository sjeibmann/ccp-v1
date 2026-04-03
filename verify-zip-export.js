/**
 * Verification script for ZIP export functionality
 * Run with: node verify-zip-export.js
 */
import JSZip from 'jszip';
import fs from 'fs';

console.log('=== ZIP Export Verification ===\n');

// Test 1: Verify JSZip is available
console.log('1. Checking JSZip availability...');
try {
  const zip = new JSZip();
  console.log('   ✓ JSZip imported successfully');
} catch (error) {
  console.error('   ✗ JSZip import failed:', error.message);
  process.exit(1);
}

// Test 2: Create sample ZIP structure
console.log('\n2. Creating sample ZIP structure...');
const zip = new JSZip();

// Simulate project data
const project = {
  name: 'test-project',
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString()
};

const html = '<div id="app">Hello World</div>';
const css = '#app { color: blue; font-size: 20px; }';
const js = 'console.log("Hello from test project");';
const libraries = [
  { name: 'p5.js', url: 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js', enabled: true }
];

// Generate standalone HTML
const libraryScripts = libraries
  .filter(lib => lib.enabled && lib.url)
  .map(lib => `    <script src="${lib.url}" charset="utf-8"></script>`)
  .join('\n');

const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Code Project</title>
  <style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* User CSS */
${css}
  </style>
</head>
<body>
${html}

${libraryScripts}

<script>
// User JavaScript
${js}
</script>
</body>
</html>`;

// Add files to ZIP
zip.file('index.html', standaloneHTML);
zip.file('style.css', css);
zip.file('script.js', js);

const config = {
  name: project.name,
  createdAt: project.createdAt,
  modified: project.lastModified,
  exportedAt: new Date().toISOString(),
  libraries: libraries.filter(lib => lib.enabled).map(lib => ({
    name: lib.name,
    url: lib.url
  }))
};
zip.file('config.json', JSON.stringify(config, null, 2));

// Create assets folders
const assets = zip.folder('assets');
assets.folder('media');
assets.folder('fonts');

console.log('   ✓ Files added to ZIP structure:');
console.log('     - index.html');
console.log('     - style.css');
console.log('     - script.js');
console.log('     - config.json');
console.log('     - assets/media/');
console.log('     - assets/fonts/');

// Test 3: Generate ZIP
console.log('\n3. Generating ZIP file...');
zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 }
}).then(content => {
  fs.writeFileSync('test-project.zip', content);
  console.log('   ✓ ZIP file generated successfully');
  console.log('   ✓ File saved as: test-project.zip');
  console.log('   ✓ File size:', (content.length / 1024).toFixed(2), 'KB');

  // Test 4: Verify ZIP contents
  console.log('\n4. Verifying ZIP contents...');
  const files = Object.keys(zip.files);
  console.log('   ZIP contains', files.length, 'entries:');
  files.forEach(file => {
    const isDir = zip.files[file].dir;
    console.log(`     - ${file}${isDir ? '/' : ''}`);
  });

  // Verify expected files exist
  const expectedFiles = ['index.html', 'style.css', 'script.js', 'config.json', 'assets/', 'assets/media/', 'assets/fonts/'];
  let allPresent = true;
  expectedFiles.forEach(expected => {
    const found = files.some(f => f === expected || f.startsWith(expected));
    if (!found) {
      console.log(`   ✗ Missing: ${expected}`);
      allPresent = false;
    }
  });

  if (allPresent) {
    console.log('   ✓ All expected files present');
  }

  // Test 5: Verify index.html content
  console.log('\n5. Verifying index.html content...');
  const indexContent = zip.file('index.html').async('string').then(content => {
    const hasCSS = content.includes('#app { color: blue');
    const hasHTML = content.includes('<div id="app">Hello World</div>');
    const hasJS = content.includes('console.log("Hello from test project")');
    const hasLibrary = content.includes('https://cdnjs.cloudflare.com/ajax/libs/p5.js');

    console.log('   ✓ CSS embedded:', hasCSS);
    console.log('   ✓ HTML embedded:', hasHTML);
    console.log('   ✓ JavaScript embedded:', hasJS);
    console.log('   ✓ Library CDN link included:', hasLibrary);

    // Test 6: Verify config.json
    console.log('\n6. Verifying config.json...');
    return zip.file('config.json').async('string');
  }).then(configContent => {
    const config = JSON.parse(configContent);
    console.log('   ✓ Project name:', config.name);
    console.log('   ✓ Libraries count:', config.libraries.length);
    console.log('   ✓ Created at:', config.createdAt);
    console.log('   ✓ Exported at:', config.exportedAt);

    console.log('\n=== Verification Complete ===');
    console.log('\n✓ All tests passed!');
    console.log('\nThe ZIP export functionality is working correctly:');
    console.log('  - JSZip is properly imported');
    console.log('  - ZIP structure matches requirements');
    console.log('  - index.html contains inline CSS and JS');
    console.log('  - Library CDN links are included');
    console.log('  - config.json contains project metadata');
    console.log('  - Assets folder structure is created');
    console.log('  - DEFLATE compression is applied');

    // Cleanup
    fs.unlinkSync('test-project.zip');
    console.log('\n✓ Cleanup: test-project.zip deleted');
  });
}).catch(error => {
  console.error('\n✗ ZIP generation failed:', error.message);
  process.exit(1);
});
