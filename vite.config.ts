
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Permite que o app rode em subdiretórios ou caminhos relativos
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Desativa sourcemaps em produção para economizar banda
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true
  }
});
