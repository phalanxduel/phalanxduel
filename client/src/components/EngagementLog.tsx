import { useState } from 'preact/hooks';
import type { CombatLogEntry } from '@phalanxduel/shared';
import { cardLabel } from '../cards';

export interface EngagementLogProps {
  isSpectator: boolean;
  hasAttack: boolean;
  playByPlayEntries: { key: number; label: string }[];
  entries: CombatLogEntry[];
}

export function EngagementLog({
  isSpectator,
  hasAttack,
  playByPlayEntries,
  entries,
}: EngagementLogProps) {
  // Collapse by default on mobile screens (less than 1024px)
  const [isOpen, setIsOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );

  return (
    <div class={`phx-log ${isOpen ? 'is-open' : 'is-closed'}`} data-testid="engagement-log">
      <div
        class="section-label"
        onClick={() => setIsOpen(!isOpen)}
        style="cursor: pointer; display: flex; justify-content: space-between; user-select: none;"
      >
        <span>{isSpectator ? 'PLAY_BY_PLAY' : 'ENGAGEMENT_LOG'}</span>
        <span class="phx-log-toggle" style="opacity: 0.5;">
          {isOpen ? '▼' : '▲'}
        </span>
      </div>

      {isOpen && (
        <div class="phx-log-content">
          {isSpectator && playByPlayEntries.length === 0 && (
            <div style="opacity: 0.3; font-style: italic; margin-top: 1rem;">
              Waiting for first turn event...
            </div>
          )}
          {!isSpectator && !hasAttack && (
            <div style="opacity: 0.3; font-style: italic; margin-top: 1rem;">
              No combat data recorded...
            </div>
          )}
          {isSpectator &&
            playByPlayEntries.map((entry) => (
              <div
                key={entry.key}
                class="phx-log-entry phx-play-by-play-entry"
                data-testid="log-entry"
              >
                {entry.label}
              </div>
            ))}
          {!isSpectator &&
            entries
              .slice(-20)
              .reverse()
              .map((entry, i) => (
                <div key={i} class="phx-log-entry" data-testid="log-entry">
                  <span style="color: var(--gold)">T{entry.turnNumber}</span>:{' '}
                  {cardLabel(entry.attackerCard)} ATK COL {entry.targetColumn + 1}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
