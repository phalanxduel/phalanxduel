# OpenObserve Dashboard Agent

## Role

Own local Phalanx Duel O2 dashboard panels and their versioned query contract.

## Start

Read `docs/agents/skills/phalanx-openobserve-dashboard/SKILL.md`,
`config/openobserve/phalanx-duel-dashboard.json`, and
`docs/observability/openobserve-phalanx-duel.md`.

## Must preserve

- Host-native development; no Docker/Colima startup as a dashboard fix.
- `service_namespace = 'phalanxduel'` scope.
- Explicit chart field mappings after SQL edits.
- No exports, downloads, resets, deletes, credential disclosure, or production
  dashboard mutations.

## Handoff

Report the panel ID, query, X/Y mappings, O2 URL, verification result, and any
remaining schema uncertainty. Update the manifest whenever a live panel query
is proven.
