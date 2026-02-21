#!/bin/bash
set -e

# Phalanx Production Deployment Script
# This script orchestrates the full release process with version synchronization.

echo "🏁 Starting production deployment..."

# 1. Bump version and revision
bash scripts/version-bump.sh

# 2. Extract the NEW version for tagging
NEW_VER=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
echo "📦 Target version: v$NEW_VER"

# 3. Build documentation
pnpm docs:build
pnpm docs:dash

# 4. Git Commit
git add .
git commit -m "chore: deploy v$NEW_VER" || echo "⚠️ No changes to commit"

# 5. Git Tag
if git tag -l "v$NEW_VER" | grep -q "v$NEW_VER"; then
    echo "⚠️ Tag v$NEW_VER already exists locally. Deleting and recreating..."
    git tag -d "v$NEW_VER"
fi
git tag -a "v$NEW_VER" -m "Production release v$NEW_VER"

# 6. Push to origin
echo "🚀 Pushing code and tags to origin..."
git push origin main --tags --force

# 7. Deploy to Fly.io
echo "🚀 Executing Fly.io deployment..."
fly deploy

echo "✅ Deployment successful: v$NEW_VER"
