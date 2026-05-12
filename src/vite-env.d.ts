/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID — set in Cloudflare Pages env vars (Production scope). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
