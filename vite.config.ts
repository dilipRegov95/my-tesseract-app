// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['tesseract-wasm'], // Exclude tesseract-wasm from optimization
  },
  build: {
    rollupOptions: {
      external: ['tesseract-wasm'], // Ensure it's treated as external
    },
  },
  server: {
    fs: {
      strict: false, // Allow serving files from outside src
    },
  },
});
