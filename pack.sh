#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Pack browser extensions for distribution
# Creates chrome.zip and firefox.xpi from their respective directories

echo "Copying shared files..."
cp src/content.js chrome/
cp src/content.js firefox/
cp src/popup.js chrome/
cp src/popup.js firefox/
cp src/popup.html chrome/
cp src/popup.html firefox/

echo "Packing Chrome extension..."
cd chrome
zip -r ../chrome.zip . -x "*.git*"
cd ..

echo "Packing Firefox extension..."
cd firefox
zip -r ../firefox.xpi . -x "*.git*"
cd ..

echo "Cleaning up copied files..."
rm -f chrome/content.js chrome/popup.js chrome/popup.html
rm -f firefox/content.js firefox/popup.js firefox/popup.html

echo "Done. Created:"
echo "  - chrome.zip ($(stat -c%s chrome.zip 2>/dev/null || stat -f%z chrome.zip) bytes)"
echo "  - firefox.xpi ($(stat -c%s firefox.xpi 2>/dev/null || stat -f%z firefox.xpi) bytes)"
