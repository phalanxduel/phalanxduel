import { type ServerHealth } from '../state';

export function HealthBadge({ health }: { health: ServerHealth | null }) {
  const h = health ?? { color: 'red' as const, label: 'Connecting\u2026', hint: null };
  return (
    <div class={`health-badge health-badge--${h.color}`}>
      <span class="health-dot" />
      <span class="health-label">{h.label}</span>
      {h.hint ? <span class="health-hint">{h.hint}</span> : null}
    </div>
  );
}
