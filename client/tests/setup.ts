import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockReturnValue({ matches: false }),
});
