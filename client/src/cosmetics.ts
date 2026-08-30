import type { CardSkinId, MatchCosmetics } from '@phalanxduel/shared';
import { CardSkinIdSchema } from '@phalanxduel/shared';

export interface CardSkinDefinition {
  id: CardSkinId;
  name: string;
  description: string;
  unlock: string;
  cardBackImage?: string;
}

export const CARD_SKINS: readonly CardSkinDefinition[] = [
  {
    id: 'default',
    name: 'Standard Issue',
    description: 'The neutral Phalanx field treatment.',
    unlock: 'Available',
  },
  {
    id: 'dual-loop',
    name: 'Dual Loop',
    description: 'Interlocking microtonal paths, dry percussion, and cold industrial ink.',
    unlock: 'Complete one match',
    cardBackImage: '/images/card-backs/dual-loop.webp',
  },
] as const;

export const DEFAULT_MATCH_COSMETICS: MatchCosmetics = [
  { cardSkinId: 'default' },
  { cardSkinId: 'default' },
];

export function normalizeCardSkinId(value: unknown): CardSkinId {
  const parsed = CardSkinIdSchema.safeParse(value);
  return parsed.success ? parsed.data : 'default';
}
