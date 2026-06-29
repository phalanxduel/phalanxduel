# AI Design Collaboration Workflow

This tutorial covers the process for iterating on UI/UX designs collaboratively with AI assistants. Phalanx Duel utilizes an automated "Visual Flow Catalog" to feed deterministic, pixel-perfect baseline UI states into AI design tools, bridging the gap between raw codebase context and visual reasoning.

## The Problem

When asking an AI agent to redesign or iterate on a UI, providing only the source code (e.g., `lobby.tsx` or `game.tsx`) is often insufficient. AI tools need to "see" what the code produces to provide context-aware, holistic design feedback. However, manually clicking through a game to capture screenshots of every edge-case modal, phase transition, and responsive breakpoint is time-prohibitive.

## The Solution: Visual Baseline Capture

The repo includes a dedicated QA test suite that programmatically drives the UI through every possible layout, phase, and state, capturing labeled screenshots and assembling them into an interactive catalog.

### Architecture

```mermaid
graph TD
    A[Human Developer] -->|Runs script| B(pnpm qa:design-baseline)
    B --> C{Playwright Harness}
    C -->|Static Screens| D[Lobby, Auth, Settings, etc.]
    C -->|Game Screens| E[Deploy, Attack, Reinforce, etc.]
    D --> F((Captured Screenshots))
    E --> F
    F -->|Manifest.json| G(pnpm qa:design-catalog)
    G --> H[artifacts/design-baseline/current-v1/catalog.html]
    G --> I[README.md (Image paths)]
    H -->|Visual Review| A
    I -->|Prompt Context| J[AI Design Assistant]
    J -->|Provides Design/Code| A
```

## Step-by-Step Workflow

### 1. Start the local dev servers
The UI automation harness requires the client and server to be running locally.
```bash
rtk pnpm dev:server
rtk pnpm dev:client
```

### 2. Capture the Baseline
Run the capture script. You can specify a label to organize your captures (e.g., `before-redesign`, `after-redesign`, `current`).
```bash
rtk pnpm qa:design-baseline --label "current-v1"
```
This script visits all addressable screens and plays through a complete automated `bot-vs-bot` match, taking screenshots of every phase.

### 3. Generate the Flow Catalog
Convert the raw screenshots into an interactive, side-scrolling HTML layout.
```bash
rtk pnpm qa:design-catalog --label "current-v1"
```

### 4. Human + AI Collaboration
1. **Review**: Open `artifacts/design-baseline/current-v1/catalog.html` in your browser. The layout presents screens horizontally (Lobby → Game Over) with variants stacked vertically.
2. **Consult Taxonomy**: Before proposing changes, consult [`docs/system/UI_COMPONENT_TAXONOMY.md`](../system/UI_COMPONENT_TAXONOMY.md) to identify the correct semantic `data-component` tags for the elements you are changing. The UI automation relies on these semantic locators (e.g., `data-component="CardView"`).
3. **Contextualize**: Open the generated `README.md` in the artifact folder. It contains a cleanly formatted list of all screenshots and their absolute paths.
4. **Prompt**: Copy the relevant sections of the `README.md` into your AI assistant prompt (e.g., Gemini or Claude) along with your design goal, and remind the AI to preserve the `data-component` taxonomy:
   * *"I want to redesign the 'Combat' and 'Reinforce' phases. Here are the screenshots of those states from my current app. Please preserve the data-component attributes defined in UI_COMPONENT_TAXONOMY.md..."*
5. **Iterate**: After the AI suggests CSS/TSX changes, apply them, re-run the capture script with a new label (e.g., `attempt-1`), and visually compare the catalogs.

## Best Practices
- **Deterministic Captures:** The gameplay captures use a fixed PRNG seed (`12345`). This ensures that visual diffs between runs are purely due to CSS/layout changes, not different card draws.
- **Isolate the Scope:** If you are only working on the lobby, you can filter the screenshots you provide to the AI down to just the lobby variants to save token context limits.
