/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

if (!(import.meta as any).env?.VITE_SUPABASE_URL || !(import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn('Supabase VITE_SUPABASE_URL oder VITE_SUPABASE_PUBLISHABLE_KEY fehlt!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
