/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENABLE_LOCAL_SENTRY?: string;
  readonly VITE_PREACT_LOBBY?: '0' | '1';
  readonly VITE_AB_LOBBY_PREACT_PERCENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SentryToolbarInitOptions {
  organizationSlug: string;
  projectIdOrSlug: string;
  environment: string;
  sentryOrigin: string;
}

interface Window {
  triggerSentryError?: () => void;
  myUndefinedFunction?: () => void;
  SentryToolbar?: {
    init(options: SentryToolbarInitOptions): void;
  };
}

declare const __APP_VERSION__: string;
