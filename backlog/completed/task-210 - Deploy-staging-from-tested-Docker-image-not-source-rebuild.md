---
id: TASK-210
title: 'Deploy staging from tested Docker image, not source rebuild'
status: Done
assignee: []
created_date: '2026-04-06 15:39'
updated_date: '2026-05-01 16:42'
labels:
  - qa
  - ci
  - p2
  - deployment
milestone: Post-Promotion Hardening
dependencies: []
references:
  - '.github/workflows/pipeline.yml:225-248'
priority: medium
ordinal: 8090
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`.github/workflows/pipeline.yml:225-248` deploys to staging using `flyctl deploy --remote-only` from source. The `build` CI job builds and pushes a Docker image to GHCR, but that image is not what gets deployed — Fly.io performs its own remote build from source.

This means the artifact that passed all CI checks (lint, typecheck, test, adversarial) is not the artifact that runs in staging. Any discrepancy between the local build and Fly.io's remote build could go undetected.

The comment in the pipeline reads: "We keep building the artifact for GHCR and future scanning, but we deploy from source for now to resolve Fly.io auth issues."

## Fix

Resolve the Fly.io auth issue and deploy from the tagged GHCR image (`--image ghcr.io/...:<sha>`) rather than re-building from source. This ensures what was tested is what is deployed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staging deploy uses the Docker image SHA from the build job, not a source rebuild
- [x] #2 Production promote also uses the same image
- [x] #3 CI pipeline comment updated to reflect the resolved approach
- [x] #4 GHCR image is the single build artifact used from test through production
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
deploy-staging and promote-production both now use --image ${{ needs.build.outputs.image_ref }} (digest-pinned GHCR sha256 ref) instead of --remote-only. promote-production adds build to its needs so image_ref is accessible. Step names updated to reflect the resolved approach. The artifact that passes lint/typecheck/test/adversarial CI is now exactly the artifact deployed to staging and promoted to production.
<!-- SECTION:FINAL_SUMMARY:END -->
