---
name: phalanx-ui-design-capture
description: Use when generating, viewing, or iterating on the UI design using the Visual Design Baseline Capture workflow. Explains how AI tools and developers can collaboratively iterate on UX using the deterministic screenshot flow catalog.
---

# UI Design Baseline Capture

The Phalanx Duel repository utilizes an automated visual baseline capture system to enable efficient human-AI collaboration on design tasks.

## Why this exists

When iterating on UI, providing AI tools with just the raw `tsx` and `css` files often leads to blind guesses, since the AI cannot "see" how components render, float, collapse, or interact in various game phases. The Visual Flow Catalog solves this by providing a complete gallery of screenshots for every UI state, modal, and game phase.

## Tools

| Script | Purpose | Output |
|---|---|---|
| `pnpm qa:design-baseline --label [name]` | Uses Playwright to click through every single screen and deterministic gameplay phase, capturing desktop and mobile screenshots. | `artifacts/design-baseline/[name]/manifest.json` and PNGs |
| `pnpm qa:design-catalog --label [name]` | Transforms the raw screenshots into a horizontally scrolling, interactive HTML catalog where variants are stacked vertically. | `artifacts/design-baseline/[name]/catalog.html` and `README.md` |

## How to use this skill

### When the user asks for a UI redesign:
1. **Locate the Baseline:** Check if there is an existing design baseline in `artifacts/design-baseline/`. If one exists (e.g., `artifacts/design-baseline/current-v1/README.md`), read the README to get the exact paths to the UI states the user wants to redesign.
2. **Request Context:** If the baseline does not exist or the user has not provided the screenshots, instruct the user to run the capture scripts (or run them yourself if you have dev servers running) and provide the relevant screenshots from the artifact directory.
3. **Iterate:** Propose the TSX/CSS changes.
4. **Verify:** Run the capture scripts again with a new label (e.g., `pnpm qa:design-baseline --label iteration-1`) so the user can visually verify the changes in the generated `catalog.html`.

### Note for running the scripts:
The capture script requires the local development servers (`pnpm dev:server` and `pnpm dev:client`) to be running.
