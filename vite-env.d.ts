
/**
 * Fix: Manually defining the ImportMeta interface to resolve the 'vite/client' type definition error.
 * This ensures that import.meta.env is correctly typed and recognized by the TypeScript compiler.
 * Fixed "Duplicate index signature" by removing redundant string index and "identical modifiers" by aligning with base types.
 */
interface ImportMetaEnv {
  VITE_APPS_SCRIPT_URL: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}