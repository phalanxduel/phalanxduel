# Phalanx Technical Reference

Welcome to the internal technical documentation for **Phalanx**, a tactical 1v1 card combat game built for the modern web.

## 1. Project Philosophy: "Hardened & Upgrade-Forward"
Phalanx is developed with a strict focus on technical integrity and zero technical debt. We adhere to these core mandates:
- **Deterministic Logic**: The game rules in `@phalanx/engine` are pure, side-effect-free functions.
- **Total Observability**: We use a dual-metrics strategy (Sentry + PostHog + OTel) to monitor every game state transition.
- **Strict Typing**: Zod-validated schemas are the authoritative source of truth for both data and network protocols.

## 2. Architecture Overview
The system is a TypeScript monorepo managed by `pnpm`:

| Package | Role | Key Technologies |
| :--- | :--- | :--- |
| `shared` | The "Contract" | Zod, JSON Schema |
| `engine` | The "Rules" | Deterministic TS Logic, Vitest |
| `server` | The "Host" | Fastify, WebSocket, OTel, Sentry |
| `client` | The "UI" | Vite, Vanilla CSS, Sentry, PostHog |

### State Synchronization
We use **Event Sourcing** principles. Actions are validated by the engine, applied to produce a new state, and the resulting delta is synced over WebSockets. Every transition is hashed and verifiable.

## 3. Key Resources
- **API Reference**: [Live OpenAPI Docs](https://phalanx-game.fly.dev/docs)
- **Monitoring**: [Sentry Dashboard](https://sentry.io/) (Search by `visitorId`)
- **Product Flow**: [PostHog Dashboard](https://us.posthog.com/)
- **Deployment**: [Fly.io Monitoring](https://fly.io/apps/phalanx-game)

## 4. Development Workflow
Before committing, you must ensure all "Hardening Gates" pass:
```bash
pnpm lint       # Strict type-checked linting
pnpm typecheck  # Workspace-wide type safety
pnpm test       # Coverage threshold: >80%
pnpm schema:check # Prevents API contract drift
```

## 5. Licensing & Ethics
Phalanx uses a **Split-License Model**:
- **Logic & Code**: [GPL-3.0-or-later](https://github.com/just3ws/phalanx/blob/main/LICENSE) (Hardened Open Source)
- **Media & Assets**: [CC BY-NC-SA 4.0](https://github.com/just3ws/phalanx/blob/main/LICENSE-ASSETS) (Attribution-NonCommercial)

See [docs/PRIVACY_AND_ETHICS.md](https://github.com/just3ws/phalanx/blob/main/docs/PRIVACY_AND_ETHICS.md) for our ethical mandates regarding player data and architectural honesty.

---
*Generated: February 21, 2026 | Phalanx Technical Reference v0.2.2*
