
import { createClient } from '@supabase/supabase-js';

// Ambil URL dan Key dari environment variables yang telah di-inject oleh Vite
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials tidak ditemui. Sila pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah ditetapkan.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);
