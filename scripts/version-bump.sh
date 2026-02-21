#!/bin/bash
set -e

# Robust version-bump script for Phalanx Duel
# Centralizes version tracking in CHANGELOG.md and synchronizes across the project.

VERSION_FILE="shared/package.json"
CHANGELOG_FILE="CHANGELOG.md"

# 1. Extract latest versions from all sources
FILE_VERSION=$(grep '"version":' "$VERSION_FILE" | head -n 1 | awk -F '"' '{print $4}')
GIT_VERSION=$(git tag -l "v*" --sort=-v:refname | head -n 1 | sed 's/^v//' || echo "0.0.0")
CHANGELOG_VERSION=$(grep -oE '## \[([0-9]+\.[0-9]+\.[0-9]+(-rev\.[0-9]+)?)\]' "$CHANGELOG_FILE" | head -n 1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+(-rev\.[0-9]+)?' || echo "0.0.0")

echo "🔍 Detected versions:"
echo "   File:      $FILE_VERSION"
echo "   Git Tag:   $GIT_VERSION"
echo "   Changelog: $CHANGELOG_VERSION"

# 2. Determine the absolute winner (highest version)
# Use sort -V which we verified handles -rev.X correctly
CURRENT_VERSION=$(printf "%s\n%s\n%s" "$FILE_VERSION" "$GIT_VERSION" "$CHANGELOG_VERSION" | sort -V | tail -n 1)

# 3. Parse base and revision
if [[ $CURRENT_VERSION =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-rev\.([0-9]+))? ]]; then
    BASE_VERSION="${BASH_REMATCH[1]}"
    REV="${BASH_REMATCH[3]:-0}"
else
    # Fallback for unexpected formats
    BASE_VERSION=$(echo "$CURRENT_VERSION" | cut -d'-' -f1)
    REV=$(echo "$CURRENT_VERSION" | grep -oE 'rev\.[0-9]+' | cut -d'.' -f2 || echo "0")
fi

NEXT_REV=$((REV + 1))
NEW_VERSION="$BASE_VERSION-rev.$NEXT_REV"

echo "🆙 Baseline: $CURRENT_VERSION"
echo "🚀 Target:   $NEW_VERSION"

# 4. Synchronize all package.json files
find . -name "package.json" -not -path "*/node_modules/*" -exec sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/g" {} +

# 5. Synchronize shared/src/schema.ts
sed -i '' "s/SCHEMA_VERSION = '.*'/SCHEMA_VERSION = '$NEW_VERSION'/g" shared/src/schema.ts

# 6. Update CHANGELOG.md
# We replace the top version header or inject a new one if the base version changed
DATE=$(date +%Y-%m-%d)
# Look for the exact base version header (ignoring rev)
if grep -q "## \[$BASE_VERSION" "$CHANGELOG_FILE"; then
    # Update the existing section to the new full version
    # We replace the first match of a version header starting with the same base
    sed -i '' "1,/## \[$BASE_VERSION/s/## \[$BASE_VERSION[^]]*\]/## \[$NEW_VERSION\]/" "$CHANGELOG_FILE"
    sed -i '' "s/## \[$NEW_VERSION\].*/## \[$NEW_VERSION\] - $DATE/g" "$CHANGELOG_FILE"
else
    # New base version, add at top
    sed -i '' "8i\\
## [$NEW_VERSION] - $DATE\\
\\
" "$CHANGELOG_FILE"
fi

echo "✅ Version synchronization complete: $NEW_VERSION"
