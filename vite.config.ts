
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Memberitahu TS bahawa process wujud dalam persekitaran Node semasa config ini dijalankan
declare var process: any;

export default defineConfig({
  plugins: [react()],
  define: {
    // Memastikan process.env.API_KEY tersedia di frontend pada waktu build
    // Ditambah fallback string kosong untuk keselamatan
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
