/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY__CLIENT__SENTRY_DSN?: string;
  readonly VITE_ENABLE_LOCAL_SENTRY?: string;
  readonly VITE_PREACT_LOBBY?: '0' | '1';
  readonly VITE_AB_LOBBY_PREACT_PERCENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
