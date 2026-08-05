import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración Vite para IOCA Sell-Through Intelligence
// Optimizada para despliegue en Vercel
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    open: true,
  },
});
