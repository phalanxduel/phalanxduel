/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_PREACT_LOBBY?: '0' | '1';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
