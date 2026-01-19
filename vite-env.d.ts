/**
 * Fix: Removed the triple-slash reference to 'vite/client' which was causing a "Cannot find type definition file" error.
 * Manually defined ImportMeta and ImportMetaEnv to ensure the project still has type information for environment variables.
 */

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  // Fix: Removed readonly to ensure all declarations of 'env' have identical modifiers.
  env: ImportMetaEnv;
}
