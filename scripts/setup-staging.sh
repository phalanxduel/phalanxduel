#!/bin/bash
# Fly.io Staging Environment Setup Script
# This script completes the phalanxduel-staging setup

set -e

APP="phalanxduel-staging"
echo "🚀 Setting up $APP on Fly.io..."

# Step 1: Verify app exists
echo ""
echo "📋 Checking app status..."
flyctl apps list | grep "$APP" || {
  echo "❌ App $APP not found. Run: fly launch --name $APP"
  exit 1
}

# Step 2: Provide secret setup instructions
echo ""
echo "🔐 Next: Set up required secrets"
echo ""
echo "You need to provide:"
echo "1. DATABASE_URL (from Neon staging branch)"
echo ""
echo "Run these commands:"
echo ""
echo "  fly secrets set --app $APP DATABASE_URL='postgresql://...'"
echo ""

# Step 3: Check for database URL
echo ""
echo "⏳ Waiting for user to set DATABASE_URL..."
echo ""
echo "Instructions:"
echo "1. Create a Neon staging branch (or use existing staging database)"
echo "   - Go to: https://console.neon.tech"
echo "   - Copy the pooled connection string"
echo ""
echo "2. Set the DATABASE_URL secret:"
echo "   fly secrets set --app $APP DATABASE_URL='postgresql://user:pass@c.neon.tech/dbname'"
echo ""
echo "3. Verify it was set:"
echo "   fly secrets list --app $APP"
echo ""

# Step 4: Provide deploy instructions
echo ""
echo "✅ Once secrets are set, deploy with:"
echo ""
echo "  fly deploy --app $APP"
echo ""
echo "Or to use a specific image:"
echo ""
echo "  docker build -t phalanxduel:staging ."
echo "  docker tag phalanxduel:staging registry.fly.io/$APP:staging"
echo "  docker push registry.fly.io/$APP:staging"
echo "  fly deploy --app $APP --image registry.fly.io/$APP:staging"
echo ""

echo ""
echo "📚 Reference:"
echo "- Fly.io docs: https://fly.io/docs/getting-started/deploy/"
echo "- App dashboard: https://fly.io/apps/$APP"
echo "- Logs: fly logs --app $APP"
echo "- Status: fly status --app $APP"
echo ""
