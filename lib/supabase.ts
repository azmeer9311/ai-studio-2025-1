
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 * Uses variables injected via vite.config.ts define block.
 */
declare var process: any;

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nbhlclzejwwqozkbixkk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// If key is missing, we use a placeholder to prevent the 'required' crash, 
// though actual DB calls will require the real key in the environment.
const finalKey = supabaseAnonKey || 'no-key-provided';

export const supabase = createClient(supabaseUrl, finalKey);
