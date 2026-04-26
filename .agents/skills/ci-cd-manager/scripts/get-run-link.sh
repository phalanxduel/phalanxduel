#!/bin/bash
# .agents/skills/ci-cd-manager/scripts/get-run-link.sh
# Returns the markdown link for the most recent GHA run for the current branch.

BRANCH=$(git rev-parse --abbrev-ref HEAD)
RUN_DATA=$(gh run list --workflow pipeline.yml --branch "$BRANCH" --limit 1 --json databaseId,url,status,conclusion --jq '.[0]')

if [ -z "$RUN_DATA" ]; then
  echo "No runs found for branch $BRANCH"
  exit 1
fi

ID=$(echo "$RUN_DATA" | jq -r '.databaseId')
URL=$(echo "$RUN_DATA" | jq -r '.url')
STATUS=$(echo "$RUN_DATA" | jq -r '.status')
CONCLUSION=$(echo "$RUN_DATA" | jq -r '.conclusion')

echo "👉 **[GHA Run #$ID]($URL)** (Status: \`$STATUS\`, Conclusion: \`$CONCLUSION\`)"
