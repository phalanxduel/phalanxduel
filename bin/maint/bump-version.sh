#!/bin/bash
set -e

# Bump version across all project files.
# Usage: bash bin/maint/bump-version.sh <version>
# Example: bash bin/maint/bump-version.sh 0.3.0

if [ -z "$1" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.3.0"
  exit 1
fi

NEW_VERSION="$1"

# Validate semver (with optional -rev.N or -prerelease suffix)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  echo "Error: '$NEW_VERSION' is not a valid semver version"
  exit 1
fi

# Show current version
CURRENT=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "Current: $CURRENT"
echo "Target:  $NEW_VERSION"

if [ "$CURRENT" = "$NEW_VERSION" ]; then
  echo "Already at $NEW_VERSION, nothing to do."
  exit 0
fi

# 1. Update all package.json files
find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/g" {} +

# 2. Update SCHEMA_VERSION in shared/src/schema.ts
sed -i '' "s/SCHEMA_VERSION = '.*'/SCHEMA_VERSION = '$NEW_VERSION'/g" shared/src/schema.ts

# 3. Update CHANGELOG.md
DATE=$(date +%Y-%m-%d)
CHANGELOG_FILE="CHANGELOG.md"

if grep -q "## \[$NEW_VERSION\]" "$CHANGELOG_FILE"; then
  echo "CHANGELOG.md already has entry for $NEW_VERSION"
else
  # Insert new version header after the changelog preamble (line 8)
  sed -i '' "8i\\
## [$NEW_VERSION] - $DATE\\
\\
" "$CHANGELOG_FILE"
  echo "Added CHANGELOG.md entry for $NEW_VERSION"
fi

# 4. Verify
echo ""
echo "Updated files:"
git diff --name-only
echo ""
echo "Version bumped to $NEW_VERSION"
