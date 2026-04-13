#!/usr/bin/env bash
set -euo pipefail

NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')

echo "🏷️  Tagging and pushing v$NEW_VER..."

# Only commit if there are changes
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    # We shouldn't use `git add .` safely, but for now we'll add tracked modifications and doc artifacts
    git add shared/package.json engine/package.json server/package.json client/package.json package.json pnpm-lock.yaml docs/
    git commit -m "chore: release v$NEW_VER"
else
    echo "⚠️ No changes to commit"
fi

if git tag -l "v$NEW_VER" | grep -q "v$NEW_VER"; then
    echo "⚠️ Tag v$NEW_VER already exists locally. Deleting and recreating..."
    git tag -d "v$NEW_VER"
fi

git tag -a "v$NEW_VER" -m "Release v$NEW_VER"

echo "🚀 Pushing code and tags to origin..."
git push origin HEAD && git push origin --tags

echo "✅ Tagging complete. Next: pnpm deploy:production"
