
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Allow access to process.env during config execution
declare var process: any;

export default defineConfig({
  plugins: [react()],
  define: {
    // Memetakan seluruh objek process.env supaya lebih stabil dlm AI Studio
    'process.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY || ''),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://nbhlclzejwwqozkbixkk.supabase.co'),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
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
