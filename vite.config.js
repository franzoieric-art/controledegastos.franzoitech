import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // App Principal (Login/Sistema)
        app: resolve(__dirname, 'app.html'), 
        
        // Landing Page (Caminho absoluto para a subpasta)
        landing: resolve(__dirname, 'ricoplus-landing-page/index.html') 
      }
    }
  }
});