import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O front roda as regras de shared/ no navegador (Opção A).
// GitHub Pages serve o site em /<nome do repositório>/; no Actions, GITHUB_REPOSITORY dá o nome (assim o mesmo código publica
// em qualquer repositório). Fora dele vale o do projeto original. As rotas usam HashRouter, então recarregar a página funciona.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
export default defineConfig({
  base: repo ? `/${repo}/` : '/NasaSpaceAppsChallenge2026/',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      // Bibliotecas em pedaços separados: o app fica abaixo do aviso de 500 kB por arquivo.
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'], motion: ['framer-motion'], three: ['three'] } },
    },
  },
});
