#!/bin/bash
set -e

# This script generates a Dash-compatible .docset using 'dashing'
# It extracts the version from shared/package.json to ensure Dash detects updates.

DOCS_DIR="docs/api"
DOCSET_NAME="Phalanx"
VERSION=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')

if [ ! -d "$DOCS_DIR" ]; then
  echo "❌ Documentation directory $DOCS_DIR not found. Run 'pnpm docs:build' first."
  exit 1
fi

echo "🚀 Generating Dash Docset v$VERSION..."

# Create a dashing.json with versioning
cat <<EOF > dashing.json
{
    "name": "$DOCSET_NAME",
    "package": "$DOCSET_NAME",
    "index": "index.html",
    "selectors": {
        "dt a": "Type",
        "h1": "Module",
        "h2": "Class",
        "h3": "Function",
        "code": "Interface"
    },
    "ignore": [
        "assets"
    ]
}
EOF

# Check if dashing is installed
if ! command -v dashing &> /dev/null; then
    echo "⚠️ 'dashing' not found. Please install it to generate the .docset."
    exit 0
fi

# Build the docset
dashing build --source "$DOCS_DIR"

# Inject the version into the Info.plist so Dash.app sees it
PLIST="Phalanx.docset/Contents/Info.plist"
if [ -f "$PLIST" ]; then
    # Use sed to add/update the version string
    # Dash expects CFBundleShortVersionString
    sed -i '' "s/<string>1.0.0<\/string>/<string>$VERSION<\/string>/g" "$PLIST"
fi

mv "$DOCSET_NAME.docset" "$DOCS_DIR/"

echo "✅ $DOCSET_NAME.docset v$VERSION generated in $DOCS_DIR"
