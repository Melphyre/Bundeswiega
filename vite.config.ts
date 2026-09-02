import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    let supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    if (supabaseUrl.includes('.supabase.com')) {
      supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');
    } else if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
      const clean = supabaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (!clean.includes('.')) {
        supabaseUrl = `https://${clean}.supabase.co`;
      }
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
