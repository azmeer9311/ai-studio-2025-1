
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Allow access to process.env during config execution
declare var process: any;

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite 'define' replaces these strings literally in the source code.
    // This is the most reliable way to handle env vars in the browser.
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || ''),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '')
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
