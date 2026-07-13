import { useEffect, useState, useRef } from 'preact/hooks';
import { globalNarrationBus } from '../narration-bus';
import type { NarrationEvent, CardType } from '../narration-bus';
import { suitColor } from '../cards';
import type { Suit } from '@phalanxduel/shared';

const PHASE_LABELS: Record<string, string> = {
  DeploymentPhase: 'DEPLOYMENT',
  AttackPhase: 'BATTLE',
  ReinforcementPhase: 'REINFORCEMENT',
  gameOver: 'GAME OVER',
};

const COLUMN_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const MAX_LINES = 30;

interface TickerLine {
  id: number;
  text: string;
  className: string;
  color?: string;
}

let nextId = 1;

export function NarrationTicker() {
  const [lines, setLines] = useState<TickerLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    const unsub = globalNarrationBus.subscribe((event) => {
      const text = formatEvent(event);
      if (!text) return;

      const baseClass = getLineClass(event);
      let className = baseClass;

      const cardType = getEventCardType(event);
      if (cardType === 'ace') className += ' nr-card-ace';
      if (cardType === 'face') className += ' nr-card-face';

      if (!reducedMotion) {
        className += ' nr-ticker-enter';
      }

      const suit = getEventSuit(event);
      const color = suit ? suitColor(suit) : undefined;

      const newLine: TickerLine = {
        id: nextId++,
        text,
        className,
        color,
      };

      setLines((prev) => {
        const next = [...prev, newLine];
        if (next.length > MAX_LINES) {
          return next.slice(next.length - MAX_LINES);
        }
        return next;
      });
    });

    return unsub;
  }, [reducedMotion]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1200);
  const [isMuted, setIsMuted] = useState(!window.__commentary?.isEnabled());
  const [isMusicMuted, setIsMusicMuted] = useState(!window.__musicEngine?.getIsEnabled());

  const toggleMute = (e: Event) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    window.__commentary?.setEnabled(!newMuted);
  };

  const toggleMusicMute = (e: Event) => {
    e.stopPropagation();
    const newMuted = !isMusicMuted;
    setIsMusicMuted(newMuted);
    window.__musicEngine?.toggleMute();
  };

  return (
    <div
      class={`nr-ticker-container ${isOpen ? 'is-open' : 'is-closed'}`}
      onClick={!isOpen ? () => setIsOpen(true) : undefined}
    >
      <div
        class="section-label"
        onClick={isOpen ? () => setIsOpen(false) : undefined}
        style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;"
      >
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span>NARRATION</span>
          {isOpen && (
            <div style="display: flex; gap: 0.25rem;">
              <button
                onClick={toggleMusicMute}
                style="background: transparent; border: none; color: inherit; cursor: pointer; opacity: 0.7; font-size: 0.9rem;"
                title={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
              >
                {isMusicMuted ? '🎵❌' : '🎵'}
              </button>
              <button
                onClick={toggleMute}
                style="background: transparent; border: none; color: inherit; cursor: pointer; opacity: 0.7; font-size: 0.9rem;"
                title={isMuted ? 'Unmute Commentary' : 'Mute Commentary'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
          )}
        </div>
        <span class="phx-log-toggle" style="opacity: 0.5;">
          {isOpen ? '▼' : '▲'}
        </span>
      </div>
      {isOpen && (
        <div
          class="nr-ticker"
          role="log"
          aria-live="polite"
          aria-label="Combat narration"
          ref={containerRef}
        >
          {lines.map((line) => (
            <div
              key={line.id}
              class={line.className}
              style={line.color ? { color: line.color } : {}}
            >
              {line.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatEvent(event: NarrationEvent): string | null {
  switch (event.type) {
    case 'deploy': {
      const col = COLUMN_LABELS[event.column] ?? `${event.column + 1}th`;
      return `${event.player} deploys ${event.card} (${col})`;
    }
    case 'attack':
      return `${event.attacker} → ${event.target} (${event.damage})`;
    case 'destroyed':
      return `DESTROYED`;
    case 'overflow':
      return `↪ ${event.target} (${event.damage})`;
    case 'lp-damage':
      return `${event.damage} dmg → ${event.player}`;
    case 'pass':
      return `${event.player} passes`;
    case 'bonus':
      return event.message;
    case 'calculation':
      return `∴ ${event.equation} [${event.ruleId}]`;
    case 'terminal':
      return `── MATCH COMPLETE · TURN ${event.turnNumber} ──`;
    case 'phase-change': {
      const label = PHASE_LABELS[event.phase] ?? event.phase;
      return `── ${label} ──`;
    }
    case 'combo':
      return `${event.count}-HIT COMBO!`;
    case 'cinematic':
      return null;
  }
}

function getLineClass(event: NarrationEvent): string {
  const base = 'nr-ticker-line';
  if (event.type === 'destroyed') return `${base} nr-ticker-destroyed`;
  if (event.type === 'lp-damage') return `${base} nr-ticker-lp`;
  if (event.type === 'bonus') return `${base} nr-ticker-bonus`;
  if (event.type === 'combo') return `${base} nr-ticker-combo`;
  if (event.type === 'calculation') return `${base} nr-ticker-calculation`;
  if (event.type === 'terminal') return `${base} nr-ticker-terminal`;
  if (event.type === 'phase-change') return `${base} nr-ticker-phase`;
  return base;
}

function getEventSuit(event: NarrationEvent): Suit | undefined {
  if ('suit' in event) return event.suit;
  return undefined;
}

function getEventCardType(event: NarrationEvent): CardType | undefined {
  if ('cardType' in event) return event.cardType;
  return undefined;
}
