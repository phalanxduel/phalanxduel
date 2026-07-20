import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminInternalToken,
  adminJwtSecret,
  assertAdminProductionConfig,
  gameServerInternalUrl,
} from '../src/server/config.js';

describe('admin production configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('permits development-only defaults', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('GAME_SERVER_INTERNAL_URL', '');
    vi.stubEnv('ADMIN_INTERNAL_TOKEN', '');

    expect(adminJwtSecret()).toBe('phalanx-dev-secret');
    expect(gameServerInternalUrl()).toBe('http://127.0.0.1:3001');
    expect(adminInternalToken()).toBeUndefined();
  });

  it('rejects missing production JWT configuration', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('GAME_SERVER_INTERNAL_URL', 'http://game.internal:3001');
    vi.stubEnv('ADMIN_INTERNAL_TOKEN', 'configured-token');

    expect(() => assertAdminProductionConfig()).toThrow('JWT_SECRET must be set in production');
  });

  it('rejects missing production internal-service credentials', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'configured-jwt-secret');
    vi.stubEnv('GAME_SERVER_INTERNAL_URL', 'http://game.internal:3001');
    vi.stubEnv('ADMIN_INTERNAL_TOKEN', '');

    expect(() => assertAdminProductionConfig()).toThrow(
      'ADMIN_INTERNAL_TOKEN must be set in production',
    );
  });
});
