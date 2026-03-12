#!/bin/bash
set -euo pipefail

VERSION_FILE="shared/package.json"
CHANGELOG_FILE="CHANGELOG.md"

usage() {
  cat <<'EOF'
Usage: bash bin/maint/sync-version.sh [version]

Without an argument, the script detects the highest repo version and bumps it
to the next -rev.N value.

With an explicit semver argument, the script synchronizes the repo to that
exact version instead.
EOF
}

validate_version() {
  local candidate="$1"
  if ! [[ "$candidate" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$ ]]; then
    echo "Error: '$candidate' is not a valid semver version" >&2
    exit 1
  fi
}

extract_changelog_version() {
  grep -oE '## \[([0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?)\]' "$CHANGELOG_FILE" \
    | head -n 1 \
    | grep -oE '[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?' \
    || true
}

replace_changelog_header() {
  local current_version="$1"
  local new_version="$2"
  local date="$3"
  local tmp_file

  tmp_file="$(mktemp "${TMPDIR:-/tmp}/sync-version.XXXXXX")"
  awk -v current="$current_version" -v replacement="$new_version" -v date="$date" '
    BEGIN { replaced = 0 }
    !replaced && index($0, "## [" current "]") == 1 {
      print "## [" replacement "] - " date;
      replaced = 1;
      next;
    }
    { print }
  ' "$CHANGELOG_FILE" >"$tmp_file"
  mv "$tmp_file" "$CHANGELOG_FILE"
}

insert_changelog_header() {
  local new_version="$1"
  local date="$2"

  sed -i '' "8i\\
## [$new_version] - $date\\
\\
" "$CHANGELOG_FILE"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$#" -gt 1 ]]; then
  usage >&2
  exit 1
fi

FILE_VERSION=$(grep '"version":' "$VERSION_FILE" | head -n 1 | awk -F '"' '{print $4}')
GIT_VERSION=$(git tag -l "v*" --sort=-v:refname | head -n 1 | sed 's/^v//' || echo "0.0.0")
CHANGELOG_VERSION="$(extract_changelog_version)"

echo "🔍 Detected versions:"
echo "   File:      $FILE_VERSION"
echo "   Git Tag:   ${GIT_VERSION:-0.0.0}"
echo "   Changelog: ${CHANGELOG_VERSION:-0.0.0}"

CURRENT_VERSION=$(
  printf "%s\n%s\n%s\n" "$FILE_VERSION" "$GIT_VERSION" "$CHANGELOG_VERSION" \
    | sed '/^$/d' \
    | sort -V \
    | tail -n 1
)

if [[ "$#" -eq 1 ]]; then
  NEW_VERSION="$1"
  validate_version "$NEW_VERSION"
elif [[ $CURRENT_VERSION =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-rev\.([0-9]+))? ]]; then
  BASE_VERSION="${BASH_REMATCH[1]}"
  REV="${BASH_REMATCH[3]:-0}"
  NEXT_REV=$((REV + 1))
  NEW_VERSION="$BASE_VERSION-rev.$NEXT_REV"
else
  BASE_VERSION=$(echo "$CURRENT_VERSION" | cut -d'-' -f1)
  REV=$(echo "$CURRENT_VERSION" | grep -oE 'rev\.[0-9]+' | cut -d'.' -f2 || echo "0")
  NEXT_REV=$((REV + 1))
  NEW_VERSION="$BASE_VERSION-rev.$NEXT_REV"
fi

echo "🆙 Baseline: $CURRENT_VERSION"
echo "🚀 Target:   $NEW_VERSION"

if [[ "$FILE_VERSION" == "$NEW_VERSION" ]]; then
  echo "Already at $NEW_VERSION, nothing to do."
  exit 0
fi

find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/g" {} +

sed -i '' "s/SCHEMA_VERSION = '.*'/SCHEMA_VERSION = '$NEW_VERSION'/g" shared/src/schema.ts

DATE=$(date +%Y-%m-%d)
if [[ -n "$CHANGELOG_VERSION" ]]; then
  replace_changelog_header "$CHANGELOG_VERSION" "$NEW_VERSION" "$DATE"
else
  insert_changelog_header "$NEW_VERSION" "$DATE"
fi

echo "✅ Version synchronization complete: $NEW_VERSION"
