import { describe, it, expect } from 'vitest';

describe('client test infrastructure', () => {
  it('has a working DOM environment', () => {
    const div = document.createElement('div');
    div.id = 'app';
    document.body.appendChild(div);
    expect(document.getElementById('app')).toBeTruthy();
    div.remove();
  });
});
