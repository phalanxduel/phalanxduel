import { describe, it, expect, beforeEach } from 'vitest';
import { renderDebugButton } from '../src/debug';

describe('renderDebugButton', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('no longer renders a button', () => {
    renderDebugButton(container);
    const btn = container.querySelector('button');
    expect(btn).toBeNull();
  });
});
