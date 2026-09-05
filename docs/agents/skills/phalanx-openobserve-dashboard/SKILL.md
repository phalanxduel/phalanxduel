---
name: phalanx-openobserve-dashboard
description: Build and repair Phalanx Duel dashboards in the local OpenObserve UI using live OTel data and safe panel editing. Use when creating panels, fixing “Error Loading Data,” mapping SQL fields to chart axes, or validating the Phalanx dashboard.
---

# Phalanx OpenObserve Dashboard

Use this playbook for the local O2 dashboard at
`https://o2.localhost/web/dashboards/view?org_identifier=default&dashboard=7501905489362419712&folder=default&tab=default&refresh=Off&period=15m&print=false`.

## Preconditions

- Confirm `rtk zsvc health --json` reports `otel` and `o2` healthy.
- Confirm current telemetry is arriving before diagnosing a panel.
- Read `config/openobserve/phalanx-duel-dashboard.json`; it is the versioned
  dashboard contract.
- Keep queries scoped to `service_namespace = 'phalanxduel'`.

## Panel repair workflow

1. Open the dashboard and use the panel’s menu → **Edit Panel**.
2. Prefer SQL mode for deterministic queries.
3. Use O2’s supported `histogram()` function, not `histogram_interval()`:

   `SELECT histogram(_timestamp, '1 minute') AS time, count(*) AS total FROM "default" WHERE service_namespace = 'phalanxduel' GROUP BY time ORDER BY time`

4. Ensure the result fields are explicitly assigned: `time` to X-axis and
   `total` to Y-axis. O2 can report “required fields” even when SQL succeeds
   if these mappings are absent.
5. Click **Apply**, verify the error panel disappears, then **Save**.
6. Update the versioned manifest with the proven query shape.

## Safety

- Never click Export Dashboard, Download CSV/JSON, Reset RUM Token, Delete
  Panel, or Delete Dashboard while probing unlabeled controls.
- Do not expose O2 credentials, RUM tokens, session data, or player data in
  chat, logs, commits, or screenshots.
- Do not mutate production dashboards or production telemetry configuration.
- If a query returns no data, inspect the stream schema and time window before
  changing instrumentation.

## Verification

- Reopen the saved dashboard and confirm the panel has no error state.
- Run `rtk jq empty config/openobserve/phalanx-duel-dashboard.json`.
- Run `rtk git diff --check` and the smallest relevant client/server tests.
