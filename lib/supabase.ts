
import { createClient } from '@supabase/supabase-js';

/**
 * Fungsi pembantu untuk mengambil nilai dari process.env atau import.meta.env
 */
const getEnvValue = (key: string): string => {
  // @ts-ignore
  const val = (process?.env?.[key]) || 
              (import.meta as any).env?.[key] || 
              (window as any).process?.env?.[key] || 
              '';
  return val;
};

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL') || 'https://nbhlclzejwwqozkbixkk.supabase.co';
const supabaseKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

// Sistem akan menggunakan placeholder jika kunci belum dimasukkan di AI Studio
// Ini untuk mengelakkan aplikasi crash sebelum user sempat masukkan key
export const supabase = createClient(
  supabaseUrl,
  supabaseKey || 'placeholder-key'
);

if (!supabaseKey) {
  console.warn("NOTIS: Sila masukkan VITE_SUPABASE_ANON_KEY di tab Environment Variables (ikon kunci) untuk membolehkan login.");
}
