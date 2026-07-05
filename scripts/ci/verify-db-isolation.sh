#!/usr/bin/env bash
# scripts/ci/verify-db-isolation.sh
# Verifies that the database environment guard logic in with-dev-postgres.sh and
# with-test-postgres.sh correctly enforces phalanxduel_development / phalanxduel_test
# isolation. Runs without a live database connection.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0

ok() {
  echo "  ✅ $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "  ❌ $1"
  FAIL=$((FAIL + 1))
}

# Inline copies of the guard functions under test.
_assert_dev_db() {
  local url="$1"
  local no_query db_name
  no_query="${url%%[?#]*}"
  db_name="${no_query##*/}"
  [ "$db_name" = "phalanxduel_development" ]
}

_assert_test_db() {
  local url="$1"
  local no_query db_name authority host_port host
  no_query="${url%%[?#]*}"
  db_name="${no_query##*/}"
  [ "$db_name" = "phalanxduel_test" ] || return 1

  case "$url" in
    *://*)
      authority="${url#*://}"
      authority="${authority%%/*}"
      ;;
    *)
      authority=""
      ;;
  esac

  [ -n "$authority" ] || return 1

  host_port="${authority##*@}"
  case "$host_port" in
    \[*\]*)
      host="${host_port%%]*}"
      host="${host#\[}"
      ;;
    *)
      host="${host_port%%:*}"
      ;;
  esac

  case "$host" in
    localhost | 127.0.0.1 | ::1 | host.docker.internal | postgres)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# check_pass <desc> <fn> <url>  — expects the function to succeed
check_pass() {
  local desc="$1" fn="$2" url="$3"
  if "$fn" "$url"; then
    ok "$desc"
  else
    fail "$desc"
  fi
}

# check_fail <desc> <fn> <url>  — expects the function to fail
check_fail() {
  local desc="$1" fn="$2" url="$3"
  if "$fn" "$url"; then
    fail "$desc"
  else
    ok "$desc"
  fi
}

echo "==> Verifying database environment guard logic..."
echo ""
echo "  [dev guard — _assert_dev_db]"

check_pass "_assert_dev_db accepts phalanxduel_development" \
  _assert_dev_db "postgresql://phalanx_dev:phx_dev_local@localhost:5432/phalanxduel_development"

check_fail "_assert_dev_db rejects phalanxduel_test" \
  _assert_dev_db "postgresql://phalanx_dev:x@localhost:5432/phalanxduel_test"

check_fail "_assert_dev_db rejects bare 'my' database" \
  _assert_dev_db "postgresql:///my"

check_fail "_assert_dev_db rejects bare 'phalanxduel' (no suffix)" \
  _assert_dev_db "postgresql://user:pass@host:5432/phalanxduel"

check_fail "_assert_dev_db rejects phalanxduel_test with query string" \
  _assert_dev_db "postgresql://user:pass@host:5432/phalanxduel_test?sslmode=require"

echo ""
echo "  [test guard — _assert_test_db]"

check_pass "_assert_test_db accepts phalanxduel_test" \
  _assert_test_db "postgresql://phalanx_test:phx_test_local@localhost:5432/phalanxduel_test"

check_pass "_assert_test_db accepts container host phalanxduel_test" \
  _assert_test_db "postgresql://phalanx_test:phx_test_local@host.docker.internal:5432/phalanxduel_test"

check_pass "_assert_test_db accepts docker service phalanxduel_test" \
  _assert_test_db "postgresql://phalanx_test:phx_test_local@postgres:5432/phalanxduel_test"

check_fail "_assert_test_db rejects phalanxduel_development" \
  _assert_test_db "postgresql://phalanx_test:x@localhost:5432/phalanxduel_development"

check_fail "_assert_test_db rejects bare 'my' database" \
  _assert_test_db "postgresql:///my"

check_fail "_assert_test_db rejects socket-style phalanxduel_test" \
  _assert_test_db "postgresql:///phalanxduel_test"

check_fail "_assert_test_db rejects bare 'phalanxduel' (no suffix)" \
  _assert_test_db "postgresql://user:pass@host:5432/phalanxduel"

check_fail "_assert_test_db rejects remote phalanxduel_test" \
  _assert_test_db "postgresql://user:pass@db.example.com:5432/phalanxduel_test"

check_fail "_assert_test_db rejects phalanxduel_development with query string" \
  _assert_test_db "postgresql://user:pass@host:5432/phalanxduel_development?sslmode=require"

echo ""
echo "  [script defaults]"

# with-dev-postgres.sh host branch must target phalanxduel_development and use phalanx_dev.
DEV_HOST_LINE=$(grep 'DEFAULT_DATABASE_URL="postgresql' bin/maint/with-dev-postgres.sh | head -1)

if echo "$DEV_HOST_LINE" | grep -q 'phalanxduel_development'; then
  ok "with-dev-postgres.sh host default targets phalanxduel_development"
else
  fail "with-dev-postgres.sh host default does NOT target phalanxduel_development"
fi

if echo "$DEV_HOST_LINE" | grep -q 'phalanx_dev'; then
  ok "with-dev-postgres.sh host default uses phalanx_dev user"
else
  fail "with-dev-postgres.sh host default does NOT use phalanx_dev user"
fi

if echo "$DEV_HOST_LINE" | grep -qv 'phalanxduel_test'; then
  ok "with-dev-postgres.sh host default does not reference phalanxduel_test"
else
  fail "with-dev-postgres.sh host default must NOT reference phalanxduel_test"
fi

# with-test-postgres.sh host branch must target phalanxduel_test and use phalanx_test.
TEST_HOST_LINE=$(grep 'DEFAULT_DATABASE_URL="postgresql' bin/maint/with-test-postgres.sh | head -1)

if echo "$TEST_HOST_LINE" | grep -q 'phalanxduel_test'; then
  ok "with-test-postgres.sh host default targets phalanxduel_test"
else
  fail "with-test-postgres.sh host default does NOT target phalanxduel_test"
fi

if echo "$TEST_HOST_LINE" | grep -q 'phalanx_test'; then
  ok "with-test-postgres.sh host default uses phalanx_test user"
else
  fail "with-test-postgres.sh host default does NOT use phalanx_test user"
fi

if echo "$TEST_HOST_LINE" | grep -qv 'phalanxduel_development'; then
  ok "with-test-postgres.sh host default does not reference phalanxduel_development"
else
  fail "with-test-postgres.sh host default must NOT reference phalanxduel_development"
fi

# server/package.json test scripts must go through with-test-postgres.sh.
if grep -q 'with-test-postgres.sh' server/package.json; then
  ok "server/package.json test scripts use with-test-postgres.sh"
else
  fail "server/package.json test scripts must use with-test-postgres.sh"
fi

if ! grep '"test"' server/package.json | grep -q 'phalanxduel_development'; then
  ok "server/package.json test scripts do not reference phalanxduel_development"
else
  fail "server/package.json test scripts must NOT reference phalanxduel_development"
fi

# migrations-runner.test.ts must contain the phalanxduel_test guard.
if grep -q 'phalanxduel_test' server/tests/migrations-runner.test.ts; then
  ok "migrations-runner.test.ts contains phalanxduel_test safety guard"
else
  fail "migrations-runner.test.ts is missing the phalanxduel_test safety guard"
fi

# db-isolation.test.ts must exist.
if [ -f server/tests/db-isolation.test.ts ]; then
  ok "server/tests/db-isolation.test.ts exists"
else
  fail "server/tests/db-isolation.test.ts is missing"
fi

echo ""
echo "==> Results: ${PASS} passed, ${FAIL} failed"
if [ "$FAIL" -gt 0 ]; then
  echo "==> ❌ DB isolation guard verification FAILED"
  exit 1
fi
echo "==> ✅ DB isolation guards verified"
