# Change Surfaces

Additional criteria based on the specific area of the codebase being modified.

## Rules Engine
- [ ] Replay hash compatibility is maintained or intentionally migrated.
- [ ] State machine transitions are exhaustive.
- [ ] Formal rules documentation in `docs/gameplay/rules.md` is updated.

## API & Schmeas
- [ ] Zod schemas are updated and synchronized.
- [ ] OpenAPI/AsyncAPI specifications reflect the changes.
- [ ] Client SDKs are generated and verified.

## Server & Infrastructure
- [ ] Database migrations are tested and idempotent.
- [ ] Environment variable contracts are updated in `docs/configuration.md`.
- [ ] Graceful shutdown and health checks are verified.

## Client & UI
- [ ] Assets are optimized for production.
- [ ] Cinematic performance is verified on target devices.
- [ ] End-to-end flows are covered by Playwright.
