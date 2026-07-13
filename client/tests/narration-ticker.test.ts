import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { NarrationTicker } from '../src/components/NarrationTicker';

describe('NarrationTicker responsive ownership', () => {
  const container = document.createElement('div');

  afterEach(() => {
    render(null, container);
  });

  it('starts collapsed on mobile so narration does not cover battlefield targets', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    render(h(NarrationTicker, {}), container);

    const ticker = container.querySelector('.nr-ticker-container');
    expect(ticker?.classList.contains('is-closed')).toBe(true);

    act(() => {
      ticker?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(ticker?.classList.contains('is-open')).toBe(true);
  });

  it('starts open when it owns a desktop grid area', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    render(h(NarrationTicker, {}), container);

    expect(container.querySelector('.nr-ticker-container')?.classList.contains('is-open')).toBe(
      true,
    );
  });
});
