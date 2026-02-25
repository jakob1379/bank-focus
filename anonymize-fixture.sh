#!/usr/bin/env bash
# Anonymize Nykredit HTML test fixture
# Removes or replaces identifying information

set -euo pipefail

HTML_FILE="tests/fixtures/Nykredit Privat.html"

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: $HTML_FILE not found"
    exit 1
fi

echo "Anonymizing $HTML_FILE..."

# Create backup
cp "$HTML_FILE" "$HTML_FILE.backup"

# Replace git commit hash with placeholder
sed -i 's/name="commit" content="[a-f0-9]*"/name="commit" content="ANONYMIZED_COMMIT_HASH"/g' "$HTML_FILE"

# Replace build timestamp with placeholder
sed -i 's/name="build_id" content="[^"]*"/name="build_id" content="ANONYMIZED_BUILD_ID"/g' "$HTML_FILE"

# Replace nykredit-specific URLs with generic placeholders
sed -i 's|https://netbank.nykredit.dk/privat/|https://example.com/bank/|g' "$HTML_FILE"
sed -i 's|https://netbank.nykredit.dk/|https://example.com/|g' "$HTML_FILE"

# Replace nykredit.dk email domains
sed -i 's|@nykredit.dk|@example.com|g' "$HTML_FILE"

# Replace bank logo references with generic
sed -i 's|Nykredit Logo|Bank Logo|g' "$HTML_FILE"
sed -i 's|Nykredit Privat|Bank Overview|g' "$HTML_FILE"

# Replace any potential account number patterns (XXXX-XXXX format)
sed -i 's/\b[0-9]\{4\}-[0-9]\{4\}-[0-9]\{4\}\b/XXXX-XXXX-XXXX/g' "$HTML_FILE"

# Replace Danish CPR numbers (DDMMYY-XXXX format)
sed -i 's/\b[0-9]\{6\}-[0-9]\{4\}\b/DDMMYY-XXXX/g' "$HTML_FILE"

# Replace phone numbers
sed -i 's/\b[0-9]\{8\}\b/XXXXXXXX/g' "$HTML_FILE"
sed -i 's/+45 [0-9]\{8\}/+45 XXXXXXXX/g' "$HTML_FILE"

# Replace IP addresses if any
sed -i 's/\b[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\b/XXX.XXX.XXX.XXX/g' "$HTML_FILE"

echo "Anonymization complete!"
echo "Original file backed up to: $HTML_FILE.backup"
echo ""
echo "Summary of changes:"
echo "  - Git commit hashes replaced"
echo "  - Build timestamps replaced"
echo "  - Nykredit URLs replaced with example.com"
echo "  - Bank name references genericized"
echo "  - Account number patterns masked"
echo "  - Phone numbers masked"
echo "  - IP addresses masked"
