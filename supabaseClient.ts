/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

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
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseKey : 'placeholder-anon-key'
);

if (isSupabaseConfigured()) {
  console.log('=== SUPABASE INIT ===');
  console.log('URL vorhanden:', true);
  console.log('Key vorhanden:', true);
  console.log('URL:', supabaseUrl.substring(0, 30));

  // Sanfter Verbindungstest
  Promise.resolve(supabase.from('profiles').select('count').limit(1))
    .then(({ data, error }) => {
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
