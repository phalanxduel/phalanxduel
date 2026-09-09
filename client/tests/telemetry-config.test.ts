import { describe, expect, it } from 'vitest';
import { isLocalTelemetryHost } from '../src/telemetry-config';

describe('local demo telemetry hosts', () => {
  it.each([
    'localhost',
    '127.0.0.1',
    '[::1]',
    '::1',
    'play.phalanxduel.localhost',
    'demo.local',
    'nested.demo.local',
    'lan.phalanxduel.com',
    'play.lan.phalanxduel.com',
    'demo.play.lan.phalanxduel.com',
    'DEMO.LOCAL',
  ])('enables %s', (hostname) => {
    expect(isLocalTelemetryHost(hostname)).toBe(true);
  });

  it.each([
    'phalanxduel.com',
    'play.phalanxduel.com',
    'example.com',
    'localhost.evil.com',
    'demo.local.evil.com',
    'play.lan.phalanxduel.com.evil.com',
    'evillan.phalanxduel.com',
    'notlocalhost',
    '',
  ])('disables %s', (hostname) => {
    expect(isLocalTelemetryHost(hostname)).toBe(false);
  });
});
