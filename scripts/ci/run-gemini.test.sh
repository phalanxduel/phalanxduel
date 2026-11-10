#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/bin"
cat > "$TEST_DIR/bin/npx" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
test "$GEMINI_CLI_VERSION" = 'test-version'
test "$*" = '@google/gemini-cli@test-version --prompt test prompt'
case "$EXPECT_AUTH" in
  api) test "$GEMINI_API_KEY" = fixture ;;
  vertex)
    test "$GOOGLE_GENAI_USE_VERTEXAI" = true
    test "$GOOGLE_CLOUD_PROJECT" = test-project
    test "$GOOGLE_CLOUD_LOCATION" = test-location
    ;;
esac
test "$(cat .gemini/settings.json)" = '{}'
echo invoked > invoked
SH
chmod +x "$TEST_DIR/bin/npx"
cd "$TEST_DIR"

run_case() {
  env -i PATH="$TEST_DIR/bin:/usr/bin:/bin" SETTINGS='{}' PROMPT='test prompt' \
    GEMINI_CLI_VERSION=test-version "$@" bash "$REPO_ROOT/scripts/ci/run-gemini.sh"
}

run_case > skipped.log
grep -q 'Gemini skipped' skipped.log
test ! -e invoked
test ! -d .gemini
echo 'PASS missing auth skips before settings or network access'

run_case GEMINI_API_KEY=fixture EXPECT_AUTH=api
test -e invoked
rm invoked
run_case GOOGLE_API_KEY=fixture EXPECT_AUTH=api
test -e invoked
rm invoked
echo 'PASS primary and fallback API key authentication'

run_case GOOGLE_APPLICATION_CREDENTIALS=/unused/fixture.json \
  GCP_PROJECT_ID=test-project GCP_LOCATION=test-location EXPECT_AUTH=vertex
test -e invoked
rm invoked
echo 'PASS workload identity selects Vertex and maps project/location'

run_case GOOGLE_GENAI_USE_GCA=true EXPECT_AUTH=gca
test -e invoked
echo 'PASS explicitly configured Google Code Assist authentication'
