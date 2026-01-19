
/**
 * Fix: Manually defining the ImportMeta interface to resolve the 'vite/client' type definition error.
 * This ensures that import.meta.env is correctly typed and recognized by the TypeScript compiler.
 */
interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
