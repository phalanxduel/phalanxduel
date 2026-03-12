# Combat Narration Bus Design

## Problem

Bot turns fire every 300ms server-side, making combat hard to follow.
The existing Pizzazz announcer shows damage numbers but lacks storytelling
and frequently displays "0 damage" noise. Players need a readable,
sequential narration of what happened and why.

## Architecture

### Narration Event Bus (`narration-bus.ts`)

Typed pub/sub with a timed queue:

```typescript
type NarrationEvent =
  | { type: 'deploy'; player: string; card: string }
  | { type: 'attack'; attacker: string; target: string; damage: number }
  | { type: 'destroyed'; card: string }
  | { type: 'overflow'; target: string; damage: number }
  | { type: 'lp-damage'; player: string; damage: number }
  | { type: 'pass'; player: string; phase: string }
  | { type: 'bonus'; bonus: CombatBonusType; card: string }
  | { type: 'phase-change'; phase: GamePhase }

type NarrationEntry = { event: NarrationEvent; delayMs: number }
```

- **Producer** diffs incoming `transactionLog` against already-narrated entries
- **Queue** absorbs bursts (bot speed) and drains at readable pace
- **Subscribers** receive events via `subscribe(cb): unsubscribe`

### Data Flow

```text
Server sends gameState
       |
State dispatch (state.ts)
       |
NarrationProducer diffs transactionLog
       |
Converts new entries -> NarrationEntry[] with timing
       |
Enqueues to NarrationBus queue
       |
Bus drains queue at pace (800ms attack, 400ms destroyed, 600ms deploy)
       |
+-- Center Overlay consumer (dramatic, fades)
+-- Left Ticker consumer (persistent log, aria-live)
+-- [Future: Pizzazz effects consumer]
```

Game state renders immediately (battlefield updates in real-time).
Narration replays the story at human-readable pace, like sports commentary.

## UI Consumers

### Consumer 1: Center Overlay

- Centered text builds line-by-line as events arrive
- Each line fades in; whole block fades out ~1s after last event
- Key moments emphasized: "DESTROYED" in red, damage sized by magnitude
- Replaces existing Pizzazz combat announcer
- `prefers-reduced-motion`: instant text, no animation

### Consumer 2: Left-Side Ticker

- Compact scrolling text log, persistent on screen
- Lines append and auto-scroll to latest
- Subtle styling: smaller font, semi-transparent background
- `role="log"` + `aria-live="polite"` for screen readers
- Center overlay is `aria-hidden="true"` (ticker handles a11y)

## Narration Copy & Filtering

### Principle

If it didn't change the game state, don't announce it.

### Attack Messages

| Situation | Message |
|-----------|---------|
| Normal hit | "King of Hearts attacks Two of Spades for 11 damage" |
| Card destroyed | "DESTROYED" |
| Overflow to back row | "9 damage carries to Three of Hearts" |
| LP damage | "3 damage to Bot" |
| Blocked (diamond) | "King of Hearts attacks Two of Spades... blocked by Diamond Defense" |
| Blocked (ace invulnerable) | "Ace of Diamonds is invulnerable" |
| Zero damage (no bonus) | Suppressed |
| Face card ineligible | Suppressed |

### Deployment Messages

| Situation | Message |
|-----------|---------|
| Deploy card | "Mike deploys Ace of Spades" |
| Pass | "Mike passes" |
| Multiple deploys | Sequential: "deploys Ace of Spades... deploys Two of Hearts" |

### Bonus Callouts (only when outcome-changing)

| Bonus | Callout |
|-------|---------|
| Diamond Defense | "...halved by Diamond Defense" |
| Club Overflow | "...doubled by Club Overflow" |
| Spade LP | "...strikes directly" |
| Heart Death Shield | "Heart Death Shield absorbs the blow" |
| Ace vs Ace | "Ace breaks through invulnerability" |

## Pizzazz Coexistence

- Phase splashes, damage pops, screen shake, hit flash remain as-is
- `onCombat()` announcer disabled (replaced by center overlay)
- Damage pops skip 0-damage steps
- Future: Pizzazz effects can subscribe to narration bus

## New Files

- `client/src/narration-bus.ts` — Event types, pub/sub, queue/drain
- `client/src/narration-producer.ts` — Transaction log diffing, event generation
- `client/src/narration-overlay.ts` — Center overlay consumer
- `client/src/narration-ticker.ts` — Left-side ticker consumer

## Testing

- `narration-bus.ts`: subscribe/unsubscribe, queue ordering, drain timing
- `narration-producer.ts`: log diffing, event generation, 0-damage suppression, bonus callouts
- Consumers: integration/manual (DOM rendering)

## No Server Changes

Bot scheduling (300ms) unchanged. Narration queue handles pacing client-side.
