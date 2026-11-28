/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" runs the app against the in-browser mock backend (services/mock). */
  readonly VITE_USE_MOCK?: string;
  /** Fake network delay for the mock backend, in ms. Default 300. */
  readonly VITE_MOCK_LATENCY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
