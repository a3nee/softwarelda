import { defineConfig } from 'vite';

export default defineConfig({
  // O Three.js sozinho tem ~550 kB minificado; o aviso por omissão (500 kB) não ajuda.
  build: { chunkSizeWarningLimit: 900 },
});
