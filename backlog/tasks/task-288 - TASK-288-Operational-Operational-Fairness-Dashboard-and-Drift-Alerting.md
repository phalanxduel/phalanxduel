---
id: TASK-288
title: 'TASK-288 - Operational: Operational Fairness Dashboard and Drift Alerting'
status: Done
assignee: []
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 18:58'
labels: []
dependencies:
  - TASK-286
modified_files:
  - shared/src/telemetry.ts
  - server/src/telemetry.ts
  - server/src/match-actor.ts
  - server/src/db/match-repo.ts
  - config/grafana/dashboards/operational-fairness.json
  - config/grafana/provisioning/dashboards/dashboards.yaml
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish a unified Grafana dashboard to visualize State Hash Drift and Action Rejection rates from OTel traces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dashboard is provisioned and reflects live match health
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Established unified Grafana dashboard for State Hash Drift and Action Rejection rates. Instrumented MatchActor and MatchRepository to emit OTel metrics (game_action_rejection, game_hash_drift) and logs. Provisioned dashboard JSON and provisioning config.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Operational fairness dashboard implemented and instrumented.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
