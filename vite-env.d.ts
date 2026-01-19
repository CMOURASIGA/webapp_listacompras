/// <reference types="vite/client" />

/**
 * Fix: Removed manual ImportMeta definition to avoid 'identical modifiers' conflict with vite/client.
 * Added reference to vite/client for standard environment variable support and augmented ImportMetaEnv.
 */
interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_API_KEY: string;
}
