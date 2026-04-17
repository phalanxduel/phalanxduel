import type { GameState } from '@phalanxduel/shared';
import { type ServerHealth } from '../state';

export interface HealthBadgeProps {
  health?: ServerHealth | null;
  gs?: GameState;
  playerIndex?: number;
  label?: string;
}

export function HealthBadge({ health, gs, playerIndex, label }: HealthBadgeProps) {
  console.log(
    `[HealthBadge] Rendering color=${health?.color || 'null'} label=${label || health?.label || 'null'}`,
  );
  if (gs && playerIndex !== undefined) {
    const ps = gs.players[playerIndex];
    const lp = ps?.lifepoints ?? 0;
    const name = ps?.player.name ?? 'Unknown';
    const color = lp > 10 ? 'green' : lp > 5 ? 'yellow' : 'red';

    return (
      <div className={`health-badge health-badge--${color}`} role="status">
        <span className="health-dot" />
        <span className="health-copy">
          <span className="health-label">{label || name}</span>
          <span className="health-hint">LP {lp}</span>
        </span>
      </div>
    );
  }

  const h = health ?? { color: 'red' as const, label: 'Connecting\u2026', hint: null };
  const accessibleLabel = h.hint ? `${h.label}. ${h.hint}` : h.label;
  return (
    <div
      className={`health-badge health-badge--${h.color}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={accessibleLabel}
      data-health-color={h.color}
    >
      <span className="health-dot" />
      <span className="health-copy">
        <span className="health-label">{label || h.label}</span>
        {h.hint ? <span className="health-hint">{h.hint}</span> : null}
      </span>
    </div>
  );
}
