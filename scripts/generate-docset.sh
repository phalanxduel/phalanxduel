#!/bin/bash
set -e

# This script generates a Dash-compatible .docset using 'dashing'
# Requires 'dashing' to be installed (go install github.com/technosophos/dashing@latest)

DOCS_DIR="docs/api"
DOCSET_NAME="Phalanx"

if [ ! -d "$DOCS_DIR" ]; then
  echo "❌ Documentation directory $DOCS_DIR not found. Run 'pnpm docs:build' first."
  exit 1
fi

echo "🚀 Generating Dash Docset..."

# Create a dashing.json if it doesn't exist
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
    echo "⚠️ 'dashing' not found. Please install it to generate the .docset:"
    echo "   go install github.com/technosophos/dashing@latest"
    exit 0
fi

dashing build --source "$DOCS_DIR"
mv "$DOCSET_NAME.docset" "$DOCS_DIR/"

echo "✅ $DOCSET_NAME.docset generated in $DOCS_DIR"
