
import { createClient } from '@supabase/supabase-js';

/**
 * Real Supabase Client Configuration
 * Menggunakan Environment Variables untuk keselamatan.
 * Placeholder disediakan untuk mengelakkan ralat runtime jika kunci belum di-set.
 */

// Menggunakan standard Vite environment access
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (supabaseUrl === 'https://your-project.supabase.co') {
  console.warn("PENTING: Supabase URL belum di-set. Sila masukkan VITE_SUPABASE_URL di Environment Variables hosting hampa.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PENTING: Untuk Admin melihat password (seperti yang diminta), 
 * hampa perlu pastikan Table 'profiles' di Supabase mempunyai column:
 * - id (uuid, primary key)
 * - username (text)
 * - email (text)
 * - password (text) -> Simpan secara manual semasa SignUp
 * - is_approved (boolean)
 * - is_admin (boolean)
 * - video_limit (int8)
 * - image_limit (int8)
 * - videos_used (int8)
 * - images_used (int8)
 * - created_at (timestamptz)
 */
