import type { Suit } from '@phalanxduel/shared';

const AURA_CLASSES = [
  'pz-aura-diamonds',
  'pz-aura-hearts',
  'pz-aura-clubs',
  'pz-aura-spades',
] as const;

export function applySuitAura(element: HTMLElement, suit: Suit): void {
  element.classList.remove(...AURA_CLASSES);
  element.classList.add(`pz-aura-${suit}`);
}
