# Phalanx Duel dashboard source

This directory is the reviewable source package for the local OpenObserve
dashboard. The live dashboard is allowed to contain O2-generated layout and
field-mapping metadata; source files intentionally keep only the stable
contract: panel IDs, titles, chart types, queries, and operator intent.

## Files

- `phalanx-duel-live-panels.json` — the panels currently saved in the local
  O2 dashboard, including the hand-built field mappings that have rendered.
- `../../phalanx-duel-dashboard.json` — the full target dashboard contract,
  including panels that become useful as newly emitted metrics accumulate.
- `../backups/` — dated recovery snapshots from the O2 UI.

To recreate the board, open the dashboard, add one panel per source entry,
select the `default` logs stream, map the listed X/Y fields, run the query,
and save only after the preview renders. O2 rewrites builder queries with
generated aliases; preserve that saved query in a dated backup after a live
change.

Never place credentials, RUM tokens, player identifiers, match IDs, or raw
downloaded session data in this package.
