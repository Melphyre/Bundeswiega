/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('=== SUPABASE INIT ===');
console.log('URL vorhanden:', !!supabaseUrl);
console.log('Key vorhanden:', !!supabaseKey);
console.log('URL:', supabaseUrl?.substring(0, 30));

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
);

// Sofortiger Verbindungstest:
supabase.from('profiles').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('❌ SUPABASE VERBINDUNG FEHLGESCHLAGEN:', error.message, error.code);
  } else {
    console.log('✅ SUPABASE VERBINDUNG OK');
  }
});

