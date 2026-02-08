
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const FALLBACK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxgt0XKD21dsD8EqMNQv0-8VFvBGjrktswc8t6FC8kwKdVsIZyoelpKO4rRiXOrXBQ/exec';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const scriptUrlRaw = env.VITE_APPS_SCRIPT_URL || FALLBACK_SCRIPT_URL;
  const scriptUrl = new URL(scriptUrlRaw);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: scriptUrl.origin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => scriptUrl.pathname + path.replace(/^\/api/, '')
        }
      }
    }
  };
});
