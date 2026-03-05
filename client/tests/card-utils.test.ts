import { describe, it, expect } from 'vitest';
import type { Suit } from '@phalanxduel/shared';
import { applySuitAura } from '../src/card-utils';

describe('applySuitAura', () => {
  const suits: Suit[] = ['diamonds', 'hearts', 'clubs', 'spades'];

  it.each(suits)('adds pz-aura-%s class to element', (suit) => {
    const el = document.createElement('div');
    applySuitAura(el, suit);
    expect(el.classList.contains(`pz-aura-${suit}`)).toBe(true);
  });

  it('removes previous aura class before applying new one', () => {
    const el = document.createElement('div');
    applySuitAura(el, 'diamonds');
    expect(el.classList.contains('pz-aura-diamonds')).toBe(true);

    applySuitAura(el, 'spades');
    expect(el.classList.contains('pz-aura-spades')).toBe(true);
    expect(el.classList.contains('pz-aura-diamonds')).toBe(false);
  });

  it('only has one aura class at a time', () => {
    const el = document.createElement('div');
    el.classList.add('some-other-class');

    applySuitAura(el, 'hearts');
    const auraClasses = [...el.classList].filter((c) => c.startsWith('pz-aura-'));
    expect(auraClasses).toEqual(['pz-aura-hearts']);
    expect(el.classList.contains('some-other-class')).toBe(true);
  });
});
