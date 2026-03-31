/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PREACT_LOBBY?: '0' | '1';
  readonly VITE_AB_LOBBY_PREACT_PERCENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  myUndefinedFunction?: () => void;
}

declare const __APP_VERSION__: string;
