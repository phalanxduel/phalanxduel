#!/bin/bash
set -euo pipefail

# This script generates a Dash-compatible .docset using 'dashing'.
# It stages the generated API reference plus curated architecture/flow pages so
# Dash.app exposes more than raw API types.

DOCS_DIR="docs/api"
DOCSET_NAME="Phalanx"
VERSION=$(grep '"version":' shared/package.json | head -n 1 | awk -F '"' '{print $4}')
DASH_DIR="$DOCS_DIR/dash"
DASH_ASSETS_DIR="$DASH_DIR/assets"
DOCSET_OUTPUT_DIR="$DOCS_DIR/$DOCSET_NAME.docset"

if [ ! -d "$DOCS_DIR" ]; then
  echo "❌ Documentation directory $DOCS_DIR not found. Run 'pnpm docs:build' first."
  exit 1
fi

echo "🚀 Generating Dash Docset v$VERSION..."

# Stage curated Dash pages and diagram assets.
mkdir -p "$DASH_ASSETS_DIR"
# cp docs/system/site-flow-1.svg "$DASH_ASSETS_DIR/"
# cp docs/system/site-flow-2.svg "$DASH_ASSETS_DIR/"
cp docs/system/dependency-graph.svg "$DASH_ASSETS_DIR/"
# cp docs/system/gameplay-sequence-1.svg "$DASH_ASSETS_DIR/"
# cp docs/system/persistence-sequence-1.svg "$DASH_ASSETS_DIR/"
# cp docs/system/observability-sequence-1.svg "$DASH_ASSETS_DIR/"
# cp docs/system/domain-model-1.svg "$DASH_ASSETS_DIR/"

cat <<EOF > "$DASH_DIR/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Phalanx Duel Dash Guide v$VERSION</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 2rem auto;
      max-width: 960px;
      line-height: 1.6;
      padding: 0 1rem 4rem;
      color: #1f2937;
    }
    h1, h2 { line-height: 1.2; }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0 2rem;
    }
    .card {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 1rem;
      background: #f9fafb;
    }
    code {
      background: #f3f4f6;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>Phalanx Duel Dash Guide</h1>
  <p>
    Curated entry point for Dash.app. This docset combines the generated API
    reference with architecture and dependency overviews.
  </p>

  <div class="cards">
    <div class="card">
      <h2><a href="../index.html">API Reference</a></h2>
      <p>Typedoc-generated module, type, schema, and function reference.</p>
    </div>
    <div class="card">
      <h2><a href="architecture.html">Architecture & Flows</a></h2>
      <p>System topology, dependency graph, and module boundaries.</p>
    </div>
  </div>

  <h2>Recommended Reading Order</h2>
  <ol>
    <li><a href="architecture.html">Architecture & Flows</a></li>
    <li><a href="../modules/_phalanxduel_engine.html">@phalanxduel/engine</a></li>
    <li><a href="../modules/_phalanxduel_shared.html">@phalanxduel/shared</a></li>
  </ol>

  <h2>Diagram Index</h2>
  <ul>
    <li><a href="assets/dependency-graph.svg">Dependency Graph</a></li>
  </ul>
</body>
</html>
EOF

cat <<EOF > "$DASH_DIR/architecture.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Architecture & Flows</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 2rem auto;
      max-width: 1080px;
      line-height: 1.6;
      padding: 0 1rem 4rem;
      color: #1f2937;
    }
    img {
      max-width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      margin: 1rem 0 2rem;
    }
    .panel {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      background: #f9fafb;
      margin: 1rem 0 1.5rem;
    }
  </style>
</head>
<body>
  <h1>Architecture & Flows</h1>
  <p>
    High-level system view for browsing in Dash.app. The generated API docs are
    still authoritative for exact types and signatures; this page is for flow
    comprehension.
  </p>

  <div class="panel">
    <h2>Core Topology</h2>
    <p>
      Phalanx Duel is server-authoritative. Clients send intents, the server
      validates and applies actions through the engine, and shared schemas
      define the contract boundaries.
    </p>
    <ul>
      <li><a href="../index.html">Typedoc Landing Page</a></li>
      <li><a href="../modules/_phalanxduel_server.html">@phalanxduel/server</a></li>
      <li><a href="../modules/_phalanxduel_engine.html">@phalanxduel/engine</a></li>
      <li><a href="../modules/_phalanxduel_shared.html">@phalanxduel/shared</a></li>
      <li><a href="../modules/_phalanxduel_client.html">@phalanxduel/client</a></li>
    </ul>
  </div>

  <h2>Dependency Graph</h2>
  <img src="assets/dependency-graph.svg" alt="Dependency graph" />
</body>
</html>
EOF

cat <<EOF > "$DASH_DIR/data-models.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Data Models</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 2rem auto;
      max-width: 960px;
      line-height: 1.6;
      padding: 0 1rem 4rem;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 2rem;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 0.6rem;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f3f4f6; }
    .panel {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      background: #f9fafb;
      margin: 1rem 0 1.5rem;
    }
  </style>
</head>
<body>
  <h1>Data Models</h1>
  <p>
    Quick map of the most important runtime and persistence models. Use these
    links to jump into the generated reference for exact schemas and types.
  </p>

  <div class="panel">
    <h2>Canonical Entry Points</h2>
    <ul>
      <li><a href="../variables/_phalanxduel_shared..GameStateSchema.html">GameStateSchema</a></li>
      <li><a href="../variables/_phalanxduel_shared..PhalanxTurnResultSchema.html">PhalanxTurnResultSchema</a></li>
      <li><a href="../variables/_phalanxduel_shared..TransactionLogEntrySchema.html">TransactionLogEntrySchema</a></li>
      <li><a href="../variables/_phalanxduel_shared..MatchEventLogSchema.html">MatchEventLogSchema</a></li>
    </ul>
  </div>

  <h2>Core Runtime Models</h2>
  <table>
    <thead>
      <tr>
        <th>Model</th>
        <th>Purpose</th>
        <th>Dash Link</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>GameState</code></td>
        <td>Authoritative match snapshot used by engine and server.</td>
        <td><a href="../types/_phalanxduel_shared..GameState.html">Type</a></td>
      </tr>
      <tr>
        <td><code>PhalanxTurnResult</code></td>
        <td>Result of applying one action, including post-state and telemetry.</td>
        <td><a href="../types/_phalanxduel_shared..PhalanxTurnResult.html">Type</a></td>
      </tr>
      <tr>
        <td><code>TransactionLogEntry</code></td>
        <td>Per-turn durable audit record with hashes and derived details.</td>
        <td><a href="../types/_phalanxduel_shared..TransactionLogEntry.html">Type</a></td>
      </tr>
      <tr>
        <td><code>MatchEventLog</code></td>
        <td>Structured event-log output for replay and operator inspection.</td>
        <td><a href="../types/_phalanxduel_shared..MatchEventLog.html">Type</a></td>
      </tr>
    </tbody>
  </table>

  <h2>Durable Audit Trail</h2>
  <p>
    The server persists action history as an append-only ledger in
    <code>transaction_logs</code>. Important fields:
  </p>
  <table>
    <thead>
      <tr>
        <th>Column</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>match_id</code></td><td>Foreign key to the match.</td></tr>
      <tr><td><code>sequence_number</code></td><td>Turn-ordered action counter.</td></tr>
      <tr><td><code>action</code></td><td>Full player action payload.</td></tr>
      <tr><td><code>state_hash_before</code></td><td>Hash before apply.</td></tr>
      <tr><td><code>state_hash_after</code></td><td>Hash after apply.</td></tr>
      <tr><td><code>events</code></td><td>Derived event array for that turn.</td></tr>
    </tbody>
  </table>

  <p>
    For deeper narrative/context, see the system docs in the repo:
    <code>docs/architecture/principles.md</code> and
    <code>docs/architecture/audit-trail.md</code>.
  </p>
</body>
</html>
EOF

# Create a dashing.json with versioning
cat <<EOF > dashing.json
{
    "name": "$DOCSET_NAME",
    "package": "$DOCSET_NAME",
    "index": "dash/index.html",
    "selectors": {
        "dt a": "Type",
        "h1": "Module",
        "h2": "Class",
        "h3": "Function",
        "code": "Interface"
    },
    "ignore": [
        "assets",
        "Phalanx.docset"
    ]
}
EOF

# Check if dashing is installed
if ! command -v dashing &> /dev/null; then
    echo "⚠️ 'dashing' not found. Please install it to generate the .docset."
    exit 0
fi

# Build the docset
rm -rf "$DOCSET_OUTPUT_DIR" "$DOCSET_NAME.docset"
dashing build --source "$DOCS_DIR"

# Inject the version into the Info.plist so Dash.app sees it
PLIST="Phalanx.docset/Contents/Info.plist"
if [ -f "$PLIST" ]; then
    # Dash expects CFBundleShortVersionString/CFBundleVersion for update checks.
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string $VERSION" "$PLIST"
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION" "$PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $VERSION" "$PLIST"
fi

mv "$DOCSET_NAME.docset" "$DOCSET_OUTPUT_DIR"

echo "✅ $DOCSET_NAME.docset v$VERSION generated in $DOCSET_OUTPUT_DIR"
