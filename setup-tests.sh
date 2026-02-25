#!/usr/bin/env bash
# Setup script for Playwright tests
# Ensures extension files are in place

set -euo pipefail

cd "$(dirname "$0")"

echo "Setting up extension files for testing..."

# Copy source files to chrome/
if [ ! -f "chrome/content.js" ]; then
    cp src/content.js chrome/
fi
if [ ! -f "chrome/popup.js" ]; then
    cp src/popup.js chrome/
fi
if [ ! -f "chrome/popup.html" ]; then
    cp src/popup.html chrome/
fi

# Copy source files to firefox/
if [ ! -f "firefox/content.js" ]; then
    cp src/content.js firefox/
fi
if [ ! -f "firefox/popup.js" ]; then
    cp src/popup.js firefox/
fi
if [ ! -f "firefox/popup.html" ]; then
    cp src/popup.html firefox/
fi

echo "Extension files ready for testing"
