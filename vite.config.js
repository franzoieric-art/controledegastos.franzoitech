// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // O App principal (que agora está na raiz)
        app: './app.html', 
        
        // A Landing Page: Diz ao Vite para PEGAR este arquivo 
        // da subpasta e GARANTIR que ele seja o index.html final
        index: './ricoplus-landing-page/index.html' 
      }
    }
  }
});