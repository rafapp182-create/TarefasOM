
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Aumenta o limite do aviso para 1500kb (ajuda a limpar o log do Vercel)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Estratégia de divisão de código para bibliotecas pesadas
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separa o Firebase em um chunk próprio
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // Separa bibliotecas de exportação (PDF/Excel) que são pesadas
            if (id.includes('xlsx') || id.includes('jspdf')) {
              return 'vendor-exports';
            }
            // Outras dependências menores (React, Lucide, etc)
            return 'vendor-core';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true
  }
});
