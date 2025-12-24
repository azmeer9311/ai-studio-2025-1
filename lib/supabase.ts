
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Deklarasi process untuk keserasian browser (Vite define)
declare const process: any;

/**
 * Mengambil environment variables dengan fallback.
 * Kita gunakan placeholder URL untuk mengelakkan ralat 'Uncaught Error: supabaseUrl is required' 
 * yang menyebabkan skrin putih (app crash).
 */
const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Jika URL kosong, kita bagi placeholder supaya Supabase client tidak crash masa initialization.
const supabaseUrl = rawUrl || 'https://your-project.supabase.co';
const supabaseAnonKey = rawKey || 'your-anon-key';

if (!rawUrl || !rawKey) {
  console.error("AMARAN: Supabase URL atau Anon Key tidak dijumpai dalam environment variables.");
  console.info("Sila pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah ditetapkan.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
