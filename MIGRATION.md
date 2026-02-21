# Rebranding & Migration Plan: Phalanx -> Phalanx Duel

This document outlines the "loose ends" and steps required to migrate the project to the new brand and infrastructure.

## 1. Domain Migration (`phalanxduel.com`)
- [ ] **Fly.io Custom Domain**: Add `phalanxduel.com` and `www.phalanxduel.com` to the Fly app.
  - `fly certs add phalanxduel.com`
  - `fly certs add www.phalanxduel.com`
- [ ] **SSL Certificates**: Verify DNS propagation and Fly.io certificate issuance.
- [ ] **Application URL Updates**:
  - Update `client/src/connection.ts` (if it contains hardcoded URLs).
  - Update `server/src/app.ts` CORS and origin checks.
  - Update `fly.toml` environment variables (e.g., `PUBLIC_URL`).

## 2. GitHub Migration (`phalanxduel/game`)
- [ ] **Repository Move**: Transfer the repository to the new organization.
- [ ] **Git Remote Updates**: 
  - `git remote set-url origin https://github.com/phalanxduel/game.git`
- [ ] **GitHub Actions**: 
  - Update secrets (SENTRY_AUTH_TOKEN, FLY_API_TOKEN, POSTHOG_API_KEY) in the new organization settings.
  - Update organization-level variables.

## 3. Brand & Code Renaming
- [ ] **Package Names**:
  - Rename `@phalanx/root`, `@phalanx/engine`, etc., to `@phalanxduel/...` in all `package.json` files.
- [ ] **Visuals**:
  - Update `client/index.html` title and meta tags.
  - Replace current placeholder images/icons with `phalanxduel.com` branding.
- [ ] **Observability**:
  - Update Sentry project name and PostHog project tags.

## 4. Documentation
- [ ] Update `README.md` with new links.
- [ ] Update `LICENSE` and `COPYING` files if the legal entity changes.
- [ ] Regenerate Dash Docset with the new name `PhalanxDuel`.

## Current Status (Pre-Migration)
- Version: `0.2.3-rev.3` (Last release before migration)
- Live: `phalanx-game.fly.dev`
