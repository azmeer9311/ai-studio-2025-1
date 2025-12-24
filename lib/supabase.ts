import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Deklarasi global untuk mengelakkan ralat TS dengan process.env (Vite define)
declare const process: any;

/**
 * Fungsi pembantu untuk mendapatkan nilai dari environment variables secara selamat.
 * Ia mencuba import.meta.env dahulu (standard Vite), kemudian fallback ke process.env
 * (yang akan digantikan secara literal oleh define dalam vite.config.ts).
 */
const getEnv = (key: string): string => {
  try {
    const value = (import.meta as any).env?.[key] || process.env[key];
    return value || '';
  } catch (e) {
    return '';
  }
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

/**
 * PENTING: createClient akan melontar ralat "supabaseUrl is required" jika argumen pertama kosong.
 * Kita gunakan URL placeholder yang kelihatan sah jika kunci sebenar tiada untuk mengelakkan 
 * aplikasi daripada crash (skrin putih) semasa booting.
 */
const supabaseUrl = url && url.length > 0 ? url : 'https://fix-your-env-vars.supabase.co';
const supabaseAnonKey = key && key.length > 0 ? key : 'placeholder-key';

if (!url || !key) {
  console.warn("Supabase configuration missing. Please check your environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);