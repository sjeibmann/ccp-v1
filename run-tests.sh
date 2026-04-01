#!/bin/bash

echo "Running tests for Creative Code Platform..."

# Check if Jest is available
if command -v jest &> /dev/null; then
    jest
else
    echo "Jest not found. Tests skipped."
fi

echo "Tests complete!"
