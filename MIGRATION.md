# Rebranding & Migration Plan: Phalanx -> Phalanx Duel

This document outlines the rebranding and infrastructure migration to Phalanx Duel.

## 1. Domain & Deployment
- [ ] **Fly.io Custom Domain**: Add `phalanxduel.com` and `www.phalanxduel.com` to the Fly app.
- [ ] **SSL Certificates**: Verify DNS propagation and Fly.io certificate issuance.
- [x] **Application URL Updates**:
  - Updated `phalanxduel/client/src/main.ts` (dynamic host).
  - Updated `phalanxduel/server/src/app.ts` CORS and origin checks.
  - Updated `phalanxduel/fly.toml` with new app name `phalanxduel`.

## 2. GitHub Migration (`phalanxduel/phalanxduel`)
- [x] **Repository Move**: Renamed `just3ws/phalanx` to `phalanxduel/phalanxduel`.
- [x] **Git Remote Updates**: 
  - `git remote set-url origin git@github.com:phalanxduel/phalanxduel.git`
- [ ] **GitHub Actions**: 
  - Update secrets (SENTRY_AUTH_TOKEN, FLY_API_TOKEN, POSTHOG_API_KEY) in the new organization settings.

## 3. Brand & Code Renaming
- [x] **Package Names**:
  - Renamed `@phalanx/*` to `@phalanxduel/*` in all `package.json` files.
- [x] **Source Imports**:
  - Updated all imports from `@phalanx/` to `@phalanxduel/`.
- [x] **Visuals & Branding**:
  - Updated `client/index.html` title and meta tags.
  - Updated brand mentions in `README.md` and documentation.
- [ ] **Observability**:
  - Update Sentry project name and PostHog project tags.

## 4. Documentation & Sites
- [x] **GitHub Pages**: Updated `phalanxduel.site` (gh-pages branch) to point to `phalanxduel.com`.
- [x] **Project Wiki**: Updated `phalanxduel.wiki` with new remote.
- [ ] **Dash Docset**: Regenerate Dash Docset with the new name `PhalanxDuel`.

## Current Status
- Version: `0.2.3-rev.5`
- Live (New): `play.phalanxduel.com`
- Live (Legacy): `phalanx-game.fly.dev` (to be decommissioned)
