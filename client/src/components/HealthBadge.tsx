import { type ServerHealth } from '../state';

export function HealthBadge({ health }: { health: ServerHealth | null }) {
  const h = health ?? { color: 'red' as const, label: 'Connecting\u2026', hint: null };
  const accessibleLabel = h.hint ? `${h.label}. ${h.hint}` : h.label;
  return (
    <div
      class={`health-badge health-badge--${h.color}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={accessibleLabel}
      data-health-color={h.color}
    >
      <span class="health-dot" />
      <span class="health-copy">
        <span class="health-label">{h.label}</span>
        {h.hint ? <span class="health-hint">{h.hint}</span> : null}
      </span>
    </div>
  );
}
