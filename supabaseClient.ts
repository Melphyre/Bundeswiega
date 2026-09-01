/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) console.error('❌ VITE_SUPABASE_URL fehlt!');
if (!supabaseKey) console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY fehlt!');

export const isSupabaseConfigured = (): boolean => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseKey.includes('placeholder') &&
    supabaseUrl.startsWith('http')
  );
};

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);

if (isSupabaseConfigured()) {
  console.log('=== SUPABASE INIT ===');
  console.log('URL vorhanden:', true);
  console.log('Key vorhanden:', true);
  console.log('URL:', supabaseUrl?.substring(0, 30));

  // Sanfter Verbindungstest
  Promise.resolve(supabase.from('profiles').select('count').limit(1))
    .then(({ error }) => {
      if (error) {
        console.warn('⚠️ Supabase Verbindungswarnung:', error.message, error.code);
      } else {
        console.log('✅ SUPABASE VERBINDUNG OK');
      }
    })
    .catch((err) => {
      console.warn('⚠️ Supabase Verbindungsprüfung fehlgeschlagen:', err?.message || err);
    });
} else {
  console.log('ℹ️ Supabase ist nicht konfiguriert oder Platzhalter aktiv');
}

