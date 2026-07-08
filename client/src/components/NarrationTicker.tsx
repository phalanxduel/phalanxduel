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

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      class={`nr-ticker-container ${isOpen ? 'is-open' : 'is-closed'}`}
      onClick={!isOpen ? () => setIsOpen(true) : undefined}
    >
      <div
        class="section-label"
        onClick={isOpen ? () => setIsOpen(false) : undefined}
        style="cursor: pointer; display: flex; justify-content: space-between; user-select: none;"
      >
        <span>NARRATION</span>
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
