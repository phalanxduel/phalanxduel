#!/bin/bash
set -e

# Default to current repo owner if no org provided
if [ -z "$1" ]; then
  ORG_NAME=$(gh repo view --json owner -q ".owner.login")
else
  ORG_NAME="$1"
fi

OUTPUT_DIR="data/$ORG_NAME"
DB_FILE="gh_metadata_$ORG_NAME.db"

mkdir -p "$OUTPUT_DIR"

echo "THUNDERA SIGHT-BEYOND-SIGHT: Harvesting ORG: $ORG_NAME..."

# Get up to 1000 repos
REPOS=$(gh repo list "$ORG_NAME" --limit 1000 --json nameWithOwner -q ".[].nameWithOwner")

for REPO in $REPOS; do
  REPO_SAFE=$(echo "$REPO" | sed 's/\//_/g')
  if [ ! -f "$OUTPUT_DIR/${REPO_SAFE}_prs_deep.json" ]; then
    echo "--- Harvesting $REPO ---"
    
    # GraphQL Query
    QUERY='query($owner: String!, $name: String!, $endCursor: String) {
      repository(owner: $owner, name: $name) {
        nameWithOwner
        pullRequests(first: 50, after: $endCursor) {
          nodes {
            number
            title
            body
            state
            createdAt
            mergedAt
            author { login }
            labels(first: 10) { nodes { name } }
            files(first: 100) { nodes { path } }
            reviewThreads(first: 20) { 
                totalCount 
                nodes { isResolved comments(first: 1) { nodes { body } } }
            }
            statusCheckRollup { state }
            closingIssuesReferences(first: 10) { nodes { number } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }'

    gh api graphql --paginate --slurp -f owner="${REPO%/*}" -f name="${REPO#*/}" -f query="$QUERY" > "$OUTPUT_DIR/${REPO_SAFE}_prs_deep.json" || echo "Warning: Failed to harvest $REPO"
  fi
done

echo "Updating Organizational Knowledge Graph..."
python3 -c "import duckdb; 
import os;
import sys;
org_name = sys.argv[1];
conn = duckdb.connect(f'gh_metadata_{org_name}.db'); 
sql = open('setup_db.sql').read().replace('DATA_PATH_VAR', f\"'data/{org_name}'\");
for stmt in sql.split(';'):
    if stmt.strip():
        conn.execute(stmt);
print(f'Graph updated: gh_metadata_{org_name}.db');
" "$ORG_NAME"
