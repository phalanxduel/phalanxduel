/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  myUndefinedFunction?: () => void;
}

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;
