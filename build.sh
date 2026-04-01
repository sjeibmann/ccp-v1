#!/bin/bash

echo "Building Creative Code Platform..."

# Create dist directory
mkdir -p dist

# Copy public assets
cp -r public/* dist/

# Minify CSS
echo "Minifying CSS..."
cat src/styles/main.css | sed '/\/\*[^*]*\*+[^/]*\//d' | sed 's/  //g' > dist/styles/main.min.css

# Compress HTML
echo "Compressing HTML..."
cat public/index.html | sed '/^[[:space:]]*$/d' | sed 's/  //g' > dist/index.min.html

# Copy JS files
cp src/core/*.js dist/core/
cp src/modules/filesystem/*.js dist/modules/filesystem/
cp src/modules/project/*.js dist/modules/project/
cp src/main.js dist/

echo "Build complete! Files in dist/"
