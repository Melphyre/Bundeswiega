/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

let rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();

// Automatische Korrektur: Falls .supabase.com statt .supabase.co oder reine Projekt-ID angegeben wurde
if (rawUrl.includes('.supabase.com')) {
  rawUrl = rawUrl.replace('.supabase.com', '.supabase.co');
} else if (rawUrl && !rawUrl.includes('.supabase.co')) {
  const clean = rawUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!clean.includes('.')) {
    rawUrl = `https://${clean}.supabase.co`;
  }
}

export const supabaseUrl = rawUrl;
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback Standard-Profilbild, wenn keines eingestellt ist oder es um einen Gast ohne Account geht
export const DEFAULT_AVATAR_URL = 'https://gzfeauqvpnjowyfbavwl.supabase.co/storage/v1/object/public/avatars/unknown.svg.svg';

/**
 * Gibt die URL des Profilbildes zurück oder unknown.svg als Fallback, falls null, undefined oder leer.
 */
export function getAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_AVATAR_URL;
  }
  return url.trim();
}

/**
 * Handler für das onError-Event bei Avatar <img>-Tags, um automatisch auf unknown.svg zurückzufallen.
 */
export function handleAvatarError(e: { currentTarget?: { src?: string } | null } | Event) {
  const target = (e as any)?.currentTarget || (e as any)?.target;
  if (target && target.src !== DEFAULT_AVATAR_URL) {
    target.src = DEFAULT_AVATAR_URL;
  }
}

// Validierung
if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
  console.error('❌ VITE_SUPABASE_URL ungültig:', supabaseUrl);
}
if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY fehlt');
}

export const isSupabaseConfigured = (): boolean => {
  return (
    !!supabaseUrl &&
    !!supabaseKey &&
    supabaseUrl.includes('supabase.co') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseKey.includes('placeholder')
  );
};

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Test beim Start
supabase.from('profiles').select('id').limit(1).then(({ error }) => {
  if (error) {
    console.error('❌ Supabase Test fehlgeschlagen:', error.message);
  } else {
    console.log('✅ Supabase Verbindung OK');
  }
});


