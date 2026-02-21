# Phalanx Duel Style Guide — "Tactical Premium"

This document defines the visual language, design tokens, and UI patterns for the Phalanx Duel digital experience. Consistency in this aesthetic is critical for maintaining the game's high-stakes, strategy-first atmosphere.

---

## 1. Core Principles

- **Atmospheric Depth:** Use subtle gradients, radial lighting, and layered shadows to create a physical "tabletop" presence.
- **Tactical Clarity:** High-contrast typography and clear symbols ensure the game state is readable at a glance, even on small screens.
- **Functional "Juice":** Animations must be purposeful—highlighting a change in game state (e.g., your turn) or providing feedback for an action (e.g., card selection).
- **Accessible by Default:** All color combinations must meet WCAG AA standards (4.5:1 ratio), and all interactions must support touch, keyboard, and reduced-motion preferences.

---

## 2. Design Tokens (CSS Variables)

### Color Palette

| Category | Token | Value | Usage |
|---|---|---|---|
| **Background** | `--bg` | `#0b0906` | Main page background |
| **Surface** | `--surface` | `#151009` | Base component background |
| **Surface Up**| `--surface-up` | `#1e1810` | Hover states, raised elements |
| **Border** | `--border` | `#362a18` | Default component borders |
| **Gold** | `--gold` | `#c49a38` | Primary accent, primary buttons, highlights |
| **Gold Dim** | `--gold-dim` | `#8a6b24` | Secondary accents, help indicators |
| **Text** | `--text` | `#e8d4aa` | Primary body text (AA+) |
| **Text Muted**| `--text-muted` | `#998268` | Secondary labels, descriptions (AA) |
| **Text Dim** | `--text-dim` | `#826f58` | Placeholders, small metadata (AA) |

### Functional Colors

- **Green (`--green` / `--green-bright`):** Your turn, healing, positive states.
- **Red (`--red` / `--red-bright`):** Opponent turn, damage, forfeit, negative states.
- **Blue (`--blue`):** Reinforcement phase, spectator indicators.

### Typography

- **Display (`--font-display`):** `Cinzel`, Serif. Used for titles, section labels, and formal UI elements. Always uppercase with high letter-spacing (0.12em+).
- **Body (`--font-body`):** `Crimson Pro`, Serif. Used for descriptions, help text, and inputs. High legibility.
- **Mono (`--font-mono`):** `IBM Plex Mono`, Monospace. Used for cards (ranks/suits), battle logs, and tactical stats.

---

## 3. UI Components

### 3.1 Battlefield Cards (`.bf-cell`)
- **Structure:** Aspect ratio 3:4, `min-height: 80px`.
- **Styling:** Border-bottom should be 2px thicker than side borders to create a "seated" look.
- **Feedback:** Use `transform: scale(1.02) translateY(-2px)` and `--gold-glow` for selected cards.

### 3.2 Action Buttons (`.btn`)
- **Primary:** Gold background, dark text. Used for "Create Match" and "Join Match."
- **Secondary:** Surface background, muted text. Used for auxiliary actions.
- **Tiny:** Discrete, low-profile buttons for in-game invitations and copy-to-clipboard.

### 3.3 Contextual Help (`.help-marker`)
- **Visual:** Pulsing gold circle with a `?` symbol.
- **Placement:** Positioned at the top-right corner of the component it explains.
- **Animation:** Continuous subtle pulse (`pulse-help`) to draw attention without being distracting.

---

## 4. Motion & Animation

- **Transitions:** Use `--transition-med` (250ms) with `cubic-bezier(0.4, 0, 0.2, 1)` for all UI transitions.
- **State Changes:**
    - **Turn Start:** Use a gold glow pulse on the info bar.
    - **Card Entry:** Use a fade-up with a slight scale (`card-entry`).
- **Reduced Motion:** Always provide a fallback that removes all `transform` and `animation` properties when `prefers-reduced-motion: reduce` is detected.

---

## 5. Metadata & Global UI

- **Page Titles:** Should be dynamic. Format: `[Status] | [Game Name]`.
    - Example: `▶ YOUR TURN | Phalanx Duel`
- **Social Tags:** Every page must include OpenGraph and Twitter Card metadata for professional sharing.
- **Theme Color:** The browser's `theme-color` must always match `--bg` (`#0b0906`).
