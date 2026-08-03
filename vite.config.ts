import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_CLERK_KEY = 'pk_test_ZW5hYmxpbmctaGlwcG8tNzYuY2xlcmsuYWNjb3VudHMuZGV2JA==';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const clerkKey = env.VITE_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || DEFAULT_CLERK_KEY;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey),
        'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey),
        'process.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey),
        'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
