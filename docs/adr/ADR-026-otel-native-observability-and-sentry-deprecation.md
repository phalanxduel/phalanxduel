---
id: decision-026
title: 'DEC-2F-001 - OTel-native observability and Sentry deprecation'
owner: Project Owner + Platform
date: '2026-03-31 23:59'
status: accepted
---

# DEC-2F-001 - OTel-native observability and Sentry deprecation

## Context

The repository currently presents a mixed observability story. The preferred
local telemetry path already flows through a local OpenTelemetry collector into
the centralized LGTM stack, but active docs, release tooling, environment
contracts, and some runtime assumptions still refer to Sentry as an active
error, release, or operational backend.

That split causes three problems:

- the architecture is harder for humans and AI agents to reason about because
  "the real backend" is ambiguous
- documentation and scripts keep teaching obsolete or soon-to-be-obsolete
  workflows
- future instrumentation work remains constrained by a deprecated vendor model
  instead of the repo's intended OpenTelemetry-first design

The project owner has explicitly decided to deprecate Sentry and move entirely
to a native OpenTelemetry instrumentation experience.

## Decision

Phalanx Duel will standardize on an OpenTelemetry-native observability model.
Sentry is deprecated and MUST be removed from active architecture, tooling,
runtime expectations, environment contracts, and operator guidance.

The canonical target state is:

- application instrumentation emits OpenTelemetry signals using vendor-neutral
  OTel APIs and SDKs
- applications emit to a collector boundary appropriate to the environment
  rather than owning backend routing directly
- local development uses a local OTel collector, agent, or sidecar endpoint
  that keeps telemetry transport concerns out of the application process
- non-local environments also preserve the collector boundary, whether via a
  shared node agent, sidecar collector, or equivalent forwarding tier
- all collector paths converge on one centralized observability backend and
  operator surface rather than parallel backends
- release, deployment, and operations workflows do not depend on Sentry
  releases, DSNs, auth tokens, dashboards, or vendor-specific error triage

The collector policy is mandatory, not optional:

- application code and app-level env contracts should target a local or
  environment-local OTLP intake
- collector networking, batching, redaction, transformation, and backend
  routing belong to collector configuration rather than application code
- backend-specific naming should be avoided in app-facing helper commands and
  env contracts unless the distinction is truly operator-facing
- the centralized LGTM stack remains the single supported backend even when
  multiple collectors exist in the path

Until migration tasks complete, any remaining Sentry references are considered
transitional debt to be removed, not long-term architecture.

## Consequences

- active docs, env contracts, and release scripts must be rewritten to remove
  Sentry as a supported path
- package manifests and build/release tooling should drop Sentry-specific
  dependencies once no longer needed
- operational guidance must point engineers toward OTel signals and the
  centralized LGTM stack instead of Sentry dashboards or Sentry release flows
- a follow-on verification pass should confirm that active repo surfaces no
  longer reference Sentry or SigNoz except in explicit historical/archive
  context
