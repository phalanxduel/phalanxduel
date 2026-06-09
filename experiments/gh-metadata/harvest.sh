#!/bin/bash
set -e

# Usage: ./harvest.sh <ORG_NAME>
if [ -z "$1" ]; then
  ORG_NAME=$(gh repo view --json owner -q ".owner.login")
else
  ORG_NAME="$1"
fi

OUTPUT_DIR="data/$ORG_NAME"
DB_FILE="gh_metadata_$ORG_NAME.db"

mkdir -p "$OUTPUT_DIR"

echo "THUNDERA SOCIAL-GRAPH HARVEST: Mapping ORG: $ORG_NAME..."

REPOS=$(gh repo list "$ORG_NAME" --limit 1000 --json nameWithOwner -q ".[].nameWithOwner")

for REPO in $REPOS; do
  REPO_SAFE=$(echo "$REPO" | sed 's/\//_/g')
  if [ ! -f "$OUTPUT_DIR/${REPO_SAFE}_social_deep.json" ]; then
    echo "--- Harvesting Social Signals for $REPO ---"
    
    # EXHAUSTIVE QUERY: Pulling Authors, All Comments (Issues/PRs), and Reviewers
    QUERY='query($owner: String!, $name: String!, $endCursor: String) {
      repository(owner: $owner, name: $name) {
        nameWithOwner
        pullRequests(first: 50, after: $endCursor) {
          nodes {
            number
            title
            author { 
              login 
              ... on User { name email company bio location createdAt } 
            }
            createdAt
            mergedAt
            labels(first: 10) { nodes { name } }
            # COMMENTS (Identify Non-Dev Collaborators)
            comments(first: 100) {
              nodes {
                author { 
                  login 
                  ... on User { name company } 
                }
                body
                createdAt
              }
            }
            # REVIEWS (Identify Formal Gatekeepers)
            reviews(first: 50) {
              nodes {
                author { 
                  login 
                  ... on User { name company } 
                }
                state
                createdAt
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
        issues(first: 50, after: $endCursor) {
          nodes {
            number
            title
            author { 
              login 
              ... on User { name email company bio location } 
            }
            createdAt
            closedAt
            # ISSUE COMMENTS (Stakeholder Feedback)
            comments(first: 100) {
              nodes {
                author { 
                  login 
                  ... on User { name company } 
                }
                body
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }'

    gh api graphql --paginate --slurp -f owner="${REPO%/*}" -f name="${REPO#*/}" -f query="$QUERY" > "$OUTPUT_DIR/${REPO_SAFE}_social_deep.json" || echo "Warning: Failed to harvest $REPO"
  fi
done

echo "Consolidating Social Graph into DuckDB..."
python3 -c "import duckdb; 
import os;
import sys;
org_name = sys.argv[1];
conn = duckdb.connect(f'gh_metadata_{org_name}.db'); 
sql = open('setup_db.sql').read().replace('DATA_PATH_VAR', f\"'data/{org_name}'\");
for stmt in sql.split(';'):
    if stmt.strip():
        conn.execute(stmt);
print(f'Social Graph updated: gh_metadata_{org_name}.db');
" "$ORG_NAME"
