#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'


# Pack browser extensions for distribution
# Creates chrome.zip and firefox.xpi from their respective directories

set -e

echo "Packing Chrome extension..."
cd chrome
zip -r ../chrome.zip . -x "*.git*"
cd ..

echo "Packing Firefox extension..."
cd firefox
zip -r ../firefox.xpi . -x "*.git*"
cd ..

echo "Done. Created:"
echo "  - chrome.zip ($(stat -c%s chrome.zip 2>/dev/null || stat -f%z chrome.zip) bytes)"
echo "  - firefox.xpi ($(stat -c%s firefox.xpi 2>/dev/null || stat -f%z firefox.xpi) bytes)"
