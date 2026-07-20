const DEVELOPMENT_JWT_SECRET = 'phalanx-dev-secret';
const DEVELOPMENT_GAME_SERVER_URL = 'http://127.0.0.1:3001';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
}

function configuredValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requiredProductionValue(name: string, developmentFallback?: string): string {
  const configured = configuredValue(name);
  if (configured) return configured;

  if (isProduction()) {
    throw new Error(`${name} must be set in production`);
  }

  if (developmentFallback !== undefined) return developmentFallback;
  throw new Error(`${name} is required`);
}

export function adminJwtSecret(): string {
  return requiredProductionValue('JWT_SECRET', DEVELOPMENT_JWT_SECRET);
}

export function gameServerInternalUrl(): string {
  return requiredProductionValue('GAME_SERVER_INTERNAL_URL', DEVELOPMENT_GAME_SERVER_URL).replace(
    /\/+$/u,
    '',
  );
}

export function adminInternalToken(): string | undefined {
  const token = configuredValue('ADMIN_INTERNAL_TOKEN');
  if (!token && isProduction()) {
    throw new Error('ADMIN_INTERNAL_TOKEN must be set in production');
  }
  return token;
}

export function assertAdminProductionConfig(): void {
  adminJwtSecret();
  gameServerInternalUrl();
  adminInternalToken();
}
