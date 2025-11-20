// vite.config.js

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Diz ao Vite que o arquivo principal de entrada do App é o app.html
        main: './app.html' 
      }
    }
  }
});