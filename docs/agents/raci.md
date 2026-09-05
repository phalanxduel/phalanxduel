# Agent RACI

This is the operating RACI for local-system observability and Panoramic View
Labs (`PVL`, pronounced “Pavel”). The zdots platform is the root capability
owner; Phalanx Duel owns the domain signals and gameplay correctness.

| Work area | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| PVL initiative direction and trail vocabulary | Pavel | Mike | zdots platform agent | Phalanx Duel agents |
| Collector, context-engine, filelog/app seam, O2 host | zdots platform agent | Mike | Pavel | Phalanx Duel agents |
| Match-scoped evidence schema and trail emission | Pavel | Phalanx Duel maintainer | zdots platform agent | O2 operator |
| Authoritative gameplay, replay, and state integrity | Phalanx Duel gameplay agent | Phalanx Duel maintainer | Pavel | zdots platform agent |
| Dashboards, panels, queries, and backups | O2 operator agent | Mike | Pavel | Phalanx Duel maintainer |
| O2/Jaeger trace pairing and service-edge walkthroughs | O2 operator agent | Mike | Pavel, zdots platform agent | Phalanx Duel maintainer |
| Browser RUM and localhost privacy boundary | Local RUM agent | Phalanx Duel maintainer | Pavel, O2 operator | zdots platform agent |
| Secrets, tokens, and credentials | Keymaster agent | Mike | O2 operator, zdots platform agent | Pavel |
| Demo readiness and end-to-end proof | Demo/playthrough agent | Mike | Pavel, gameplay agent, O2 operator | zdots platform agent |

## Decision rules

- Pavel may define and mark PVL trails, but cannot redefine authoritative game
  semantics or silently change collector infrastructure.
- The zdots platform agent is the escalation point for collector,
  context-engine, and local-system capability questions.
- The O2 operator owns live dashboard state; versioned panel definitions and
  backups remain reviewable in this repository.
- The gameplay agent owns whether a trail is supported by real authoritative
  evidence rather than an inferred browser event.
- Mike remains accountable for changes that affect demo readiness, privacy,
  production boundaries, or cross-repo platform coordination.

See [Pavel's profile](./profiles/pavel-agent.md) and the
[Gameplay Panoramic View technique](../observability/gameplay-panoramic-view.md).
