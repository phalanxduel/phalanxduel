# /quick-check

Run the appropriate verification suite for the files changed.

## Decision tree

| Changed files | Command |
|---|---|
| `client/src/*.css` only | `rtk pnpm exec prettier --check client/src/style.css` |
| `client/src/**` or `shared/**` (no engine) | `rtk pnpm verify:quick` |
| `engine/**`, `server/src/**`, or `shared/**` | `rtk pnpm check` |
| `bin/qa/**` or QA-related | `rtk pnpm check && pnpm qa:playthrough:verify` |
| Any combination with unknown scope | `rtk pnpm check` |

## Notes

- `verify:quick` = lint + typecheck + build (~10s)
- `pnpm check` = verify:quick + tests + schema + replay (~60s)
- Never skip the gate when engine or server files changed
