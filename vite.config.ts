
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Memberitahu TS bahawa process wujud dalam persekitaran Node semasa config ini dijalankan
declare var process: any;

export default defineConfig({
  plugins: [react()],
  define: {
    // Memastikan API keys tersedia di frontend pada waktu build (Sync dengan Vercel)
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || ''),
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '')
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
