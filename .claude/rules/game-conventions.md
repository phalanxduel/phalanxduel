---
description: Game-specific invariants for phalanxduel — playerIndex, triggers, async patterns
paths:
  - "client/src/**"
  - "engine/**"
  - "bin/qa/**"
  - "**/*.test.ts"
---

## playerIndex null = spectator

`getState().playerIndex` is `null` for spectators. Never use it directly as a number.

```ts
const viewerIndex = getState().playerIndex ?? 0;
```

The board always renders from player-0's perspective. `'player'` cells = index 0, `'opponent'` cells = index 1.

## recordTrigger() must fire before DOM guards

`recordTrigger()` calls must happen **unconditionally before any DOM null-guard early return**. Automation (jsdom) has no DOM elements, so triggers are the only observable surface.

```ts
// ✅ correct
this.recordTrigger('deploy', `player=${p},col=${c}`);
const el = document.querySelector('.cell');
if (!el) return;
```

## Async onClick

Async functions passed to event handlers must be wrapped:

```tsx
onClick={() => { void fn(); }}   // ✅
onClick={fn}                      // ❌ ESLint no-misused-promises
```

## TransactionLogEntry action vs details

For `deploy` entries: `entry.action.column` and `entry.action.playerIndex` come from `ActionSchema`. `entry.details` only has `gridIndex`. Cast after discriminant check:

```ts
const a = entry.action as { type: 'deploy'; playerIndex: number; column: number };
```

## CSS animations without Web Animations API

jsdom doesn't support `element.animate()`. Use CSS custom properties for dynamic values:

```ts
el.style.setProperty('--pz-from-x', `${dx}px`);
el.classList.add('pz-deploy-fly');
```

Keyframe uses `calc(var(--pz-from-x))` → translates from offset to 0.
