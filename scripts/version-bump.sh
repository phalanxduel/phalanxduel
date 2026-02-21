#!/bin/bash
set -e

# Robust version-bump script for Phalanx
# This script ensures that every deployment gets a unique, incremented version number.
# It considers the current version in files, Git tags, and the changelog.

VERSION_FILE="shared/package.json"
CHANGELOG_FILE="CHANGELOG.md"

# 1. Get current version from shared/package.json
FILE_VERSION=$(grep '"version":' "$VERSION_FILE" | head -n 1 | awk -F '"' '{print $4}')

# 2. Get latest version from Git tags
GIT_VERSION=$(git tag -l "v*" --sort=-v:refname | head -n 1 | sed 's/^v//' || echo "0.0.0")

# 3. Determine the actual "current" base version and revision
# We want the maximum of what's in the file and what's in the tags.
# This prevents regressions if tags were created but local files weren't updated.

# Helper to compare versions (handles rev.X)
function get_rev() {
    local v=$1
    if [[ $v =~ rev\.([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo "0"
    fi
}

function get_base() {
    echo "$1" | cut -d'-' -f1
}

# Use the highest found version as the baseline
if [ "$(printf '%s\n%s' "$FILE_VERSION" "$GIT_VERSION" | sort -V | tail -n 1)" == "$GIT_VERSION" ]; then
    CURRENT_VERSION="$GIT_VERSION"
else
    CURRENT_VERSION="$FILE_VERSION"
fi

BASE_VERSION=$(get_base "$CURRENT_VERSION")
CURRENT_REV=$(get_rev "$CURRENT_VERSION")
NEXT_REV=$((CURRENT_REV + 1))
NEW_VERSION="$BASE_VERSION-rev.$NEXT_REV"

echo "🆙 Baseline version: $CURRENT_VERSION"
echo "🚀 Incrementing to:  $NEW_VERSION"

# Update all package.json files
# We use a broad match to ensure all versions are synced to the NEW one
find . -name "package.json" -not -path "*/node_modules/*" -exec sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/g" {} +

# Update SCHEMA_VERSION in shared/src/schema.ts
sed -i '' "s/SCHEMA_VERSION = '.*'/SCHEMA_VERSION = '$NEW_VERSION'/g" shared/src/schema.ts

# 4. Update CHANGELOG.md if needed
# If the base version is in the changelog, append the revision info
# Actually, the user wants the changelog to trigger a bump or be part of it.
DATE=$(date +%Y-%m-%d)
if grep -q "## \[$BASE_VERSION\]" "$CHANGELOG_FILE"; then
    # Base version exists, we might want to note the revision if it's significant
    # For now, we'll just ensure the header is updated with the date if it's the same day
    sed -i '' "s/## \[$BASE_VERSION\].*/## \[$BASE_VERSION\] - $DATE/g" "$CHANGELOG_FILE"
else
    # New base version, add it at the top
    # (This script currently only bumps revisions, but this is a safety check)
    sed -i '' "8i\\
## [$BASE_VERSION] - $DATE\\
\\
" "$CHANGELOG_FILE"
fi

echo "✅ Version synchronization complete: $NEW_VERSION"
