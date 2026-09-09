/** Local demo-only switches. All bypasses are opt-in and fail closed elsewhere. */
export function isDemoEmailVerificationBypassed(): boolean {
  const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'local');
  return appEnv === 'local' && process.env.PHALANX_DEMO_MODE === '1' && process.env.PHALANX_DEMO_SKIP_EMAIL_VERIFICATION === '1';
}
