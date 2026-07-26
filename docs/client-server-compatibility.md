# Client/Server Version Compatibility

Applies to every out-of-process client: `clients/go/duel-cli`, the SwiftUI
client (`game-swiftui`), and any future third-party client built against the
public SDKs in `sdk/`.

## The two version numbers

The server reports both in `GET /api/defaults`, under `_meta.versions`
(`server/src/app.ts`), and echoes `schemaVersion` alone in `GET /health`
(`version` field):

| Field | Source of truth | Governs |
|---|---|---|
| `schemaVersion` | `shared/src/schema.ts` → `SCHEMA_VERSION` | REST/WS wire format — request/response shapes, event payloads. **This is the compatibility gate.** |
| `specVersion` | `shared/src/schema.ts` → `DEFAULT_MATCH_PARAMS.specVersion` | Deterministic gameplay rules and replay reproducibility. Informational for a live client; load-bearing for replay viewers. |

Both are plain `MAJOR.MINOR.PATCH` strings, not full semver (no
pre-release/build metadata).

## The compatibility rule

**MAJOR must match.** A client compiled against `schemaVersion` major `N`
talks to any server reporting major `N`, regardless of minor/patch — minor
and patch bumps are additive/backward-compatible by convention. A major
mismatch means the wire format changed in a way the client's typed
request/response decoding cannot be assumed to survive.

This is enforced client-side, at connect time, against whatever server the
client is pointed at (dev, staging, prod) — not baked into the server, since
the server doesn't know what client version is connecting until it says so.

## What each client does on mismatch

- **duel-cli**: fetches `/api/defaults` at startup (already did, for the
  human-readable "Version semantics" line). On a major mismatch it now prints
  a clear error with the exact upgrade command
  (`brew upgrade duel-cli` or `go install github.com/phalanxduel/phalanxduel/clients/go/duel-cli@latest`)
  and exits non-zero, rather than proceeding into a match it may not be able
  to decode correctly. Override for local cross-branch development:
  `PHALANX_ALLOW_VERSION_MISMATCH=1`.
- **SwiftUI client**: fetches `/api/defaults` as part of `refreshServerSnapshot()`.
  On a major mismatch, `SessionStore.compatibilityWarning` is set and
  `ServerConnectView`'s Discovery section shows a banner with the upgrade
  command (`brew upgrade --cask phalanx-duel-client`). This is a warning, not
  a hard block — gameplay screens are reached through the same session flow
  either way, since silently refusing to run isn't friendlier than a visible,
  dismissable warning in a GUI app.

## Where each client's own version lives

- **duel-cli**: `clientVersion` const in `clients/go/duel-cli/main.go`, bumped
  alongside the `clients/go/duel-cli/vX.Y.Z` release tag.
- **SwiftUI client**: `MARKETING_VERSION` in `game-swiftui/project.yml`
  (feeds `CFBundleShortVersionString`), bumped alongside the release tag
  pushed to `phalanxduel/game-swiftui`.

Neither client version needs to track the server's `schemaVersion` numerically
— they're independent version lines. What matters is the *major* of the
`compatibleSchemaMajor` each client is built against, checked at runtime.
