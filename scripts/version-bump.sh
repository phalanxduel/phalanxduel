#!/bin/bash
set -e

# This script increments the 'revision' part of the version (e.g., 0.2.3-rev.1 -> 0.2.3-rev.2)
# It ensures every deployment has a unique, incremented version number.

VERSION_FILE="shared/package.json"
CURRENT_VERSION=$(grep '"version":' "$VERSION_FILE" | head -n 1 | awk -F '"' '{print $4}')

# Split version into base and revision
# If version is '0.2.3', base is '0.2.3', rev is '0'
# If version is '0.2.3-rev.5', base is '0.2.3', rev is '5'
BASE_VERSION=$(echo "$CURRENT_VERSION" | cut -d'-' -f1)
REV_PART=$(echo "$CURRENT_VERSION" | grep -oE 'rev\.[0-9]+' | cut -d'.' -f2 || echo "0")

NEXT_REV=$((REV_PART + 1))
NEW_VERSION="$BASE_VERSION-rev.$NEXT_REV"

echo "🆙 Bumping version: $CURRENT_VERSION ➡️ $NEW_VERSION"

# Update all package.json files
find . -name "package.json" -not -path "*/node_modules/*" -exec sed -i '' "s/"version": "$CURRENT_VERSION"/"version": "$NEW_VERSION"/g" {} +

# Update SCHEMA_VERSION in shared/src/schema.ts
# Use a more flexible regex to catch various version formats
sed -i '' "s/SCHEMA_VERSION = '.*'/SCHEMA_VERSION = '$NEW_VERSION'/g" shared/src/schema.ts

echo "✅ Version synchronization complete."
