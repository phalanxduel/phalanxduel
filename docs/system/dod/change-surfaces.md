---
title: "Definition of Done — Change Surfaces"
description: "Additional done criteria by change type. Look up the surface your change touches for extra requirements beyond the core criteria."
status: active
updated: "2026-03-14"
audience: agent
related:
  - docs/system/DEFINITION_OF_DONE.md
  - docs/system/dod/core-criteria.md
---

# Change Surfaces

Apply these extra expectations when the change touches the listed surface.

| Change surface | Additional done criteria |
| --- | --- |
| Rules engine, turn flow, replay, state machine | Cite affected rule IDs or rule sections, run `pnpm rules:check`, prove replay/hash impact was considered, and add or update regression coverage for the changed rule path. Make the verification path easy for a reviewer to follow from rule to code to test. |
| Shared schema, API, WebSocket payloads, stored match shape | Run `pnpm schema:check`, commit generated artifacts, explain backward-compatibility impact, and verify clients/replay data still interpret the contract correctly. Keep contract ownership and version expectations discoverable. |
| Server authority, auth, persistence, admin, feature flags, observability | Review hidden-state, actor-authority, privacy, secret-handling, and fail-closed behavior; update telemetry/admin/runbook docs when the operator surface changes. Ensure the support path to the critical evidence is documented, not implicit. |
| Client UX, onboarding, or gameplay presentation | Verify the changed flow manually, cover the error/reconnect/empty/loading states that matter, and ensure the UI does not imply rules or trust guarantees the backend does not actually provide. Rules and important player guidance should stay easy to find. |
| Docs, scripts, or workflow tooling | Verify the documented commands and paths against the current repo, keep canonical ownership explicit, and update hooks/CI expectations when the supported workflow changes. Verification instructions must remain runnable by someone who did not author the change. |
