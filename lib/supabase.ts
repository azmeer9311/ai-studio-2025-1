
import { createClient } from '@supabase/supabase-js';

/**
 * Real Supabase Client Configuration
 * Optimized for Vercel and Vite environment synchronization.
 */

// Define helper to get env variables safely across different environments
const getEnv = (key: string): string => {
  try {
    // 1. Check Vite standard (import.meta.env)
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv) return viteEnv;

    // 2. Check process.env (defined in vite.config.ts)
    if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
      return (process.env as any)[key];
    }
    
    return '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Fallback logic to prevent "Failed to fetch" when keys are missing or invalid
const finalUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';

const finalKey = supabaseAnonKey || 'placeholder-key';

// Initialize the client
export const supabase = createClient(finalUrl, finalKey);

/**
 * ========================================================================
 * MASTER REPAIR SQL (SILA COPY & RUN DALAM SUPABASE SQL EDITOR)
 * ========================================================================
 * 
 * -- 1. RESET TRIGGER & TABLE (FIX ERROR 500 & FAILED TO FETCH)
 * DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 * DROP FUNCTION IF EXISTS public.handle_new_user();
 * DROP TABLE IF EXISTS public.profiles CASCADE;
 * 
 * -- 2. BINA TABLE PROFILES DENGAN SCHEMA LENGKAP
 * CREATE TABLE public.profiles (
 *   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
 *   username TEXT UNIQUE,
 *   email TEXT,
 *   password TEXT,
 *   is_approved BOOLEAN DEFAULT FALSE,
 *   is_admin BOOLEAN DEFAULT FALSE,
 *   video_limit BIGINT DEFAULT 5,
 *   image_limit BIGINT DEFAULT 10,
 *   videos_used BIGINT DEFAULT 0,
 *   images_used BIGINT DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. AKTIFKAN RLS
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
 * CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
 * CREATE POLICY "Admin can do everything" ON public.profiles FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);
 * 
 * -- 4. TRIGGER FUNCTION (STABILIZER - FIX PERMISSION ISSUES)
 * CREATE OR REPLACE FUNCTION public.handle_new_user()
 * RETURNS TRIGGER 
 * LANGUAGE plpgsql
 * SECURITY DEFINER SET search_path = public
 * AS $$
 * BEGIN
 *   INSERT INTO public.profiles (id, username, email, is_approved, is_admin, video_limit, image_limit)
 *   VALUES (
 *     NEW.id, 
 *     COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)), 
 *     NEW.email, 
 *     FALSE, 
 *     FALSE, 
 *     5, 
 *     10
 *   );
 *   RETURN NEW;
 * END;
 * $$;
 * 
 * CREATE TRIGGER on_auth_user_created
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
 * 
 * -- 5. SETUP ADMIN (azmeer93)
 * DO $$
 * DECLARE
 *   admin_uid UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
 * BEGIN
 *   INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
 *   VALUES (admin_uid, '00000000-0000-0000-0000-000000000000', 'azmeer93@azmeer.ai', extensions.crypt('Azm93112@', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"azmeer93","is_admin":true}', 'authenticated', 'authenticated', now(), now())
 *   ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
 * 
 *   INSERT INTO public.profiles (id, username, email, password, is_approved, is_admin, video_limit, image_limit)
 *   VALUES (admin_uid, 'azmeer93', 'azmeer93@azmeer.ai', 'Azm93112@', TRUE, TRUE, 999999, 999999)
 *   ON CONFLICT (id) DO UPDATE SET is_admin = TRUE, is_approved = TRUE, username = EXCLUDED.username;
 * END $$;
 */
