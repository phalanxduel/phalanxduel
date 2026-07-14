import { describe, expect, it } from 'vitest';

describe('Vitest telemetry isolation', () => {
  it('disables the runtime SDK and console forwarding in server test workers', () => {
    expect(process.env.OTEL_SDK_DISABLED).toBe('true');
    expect(process.env.OTEL_CONSOLE_LOGS_ENABLED).toBe('false');
  });
});
