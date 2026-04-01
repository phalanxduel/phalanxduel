#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLI_DIR="$ROOT_DIR/clients/go/duel-cli"

echo "==> Checking Go client formatting..."
UNFORMATTED="$(cd "$CLI_DIR" && gofmt -l .)"
if [[ -n "$UNFORMATTED" ]]; then
  echo "Go files require formatting:" >&2
  echo "$UNFORMATTED" >&2
  echo "Run 'gofmt -w .' in $CLI_DIR" >&2
  exit 1
fi

echo "==> Running Go client tests..."
(cd "$CLI_DIR" && go test ./...)

echo "==> Building Go client..."
BUILD_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/phalanx-duel-cli.XXXXXX")"
trap 'rm -f "$BUILD_OUTPUT"' EXIT
(cd "$CLI_DIR" && go build -o "$BUILD_OUTPUT" .)
