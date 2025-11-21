import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // O 'main' é o index.html (Landing Page)
        main: resolve(__dirname, 'index.html'),
        // O 'app' é o app.html (Sistema de Login)
        app: resolve(__dirname, 'app.html')
      }
    }
  }
});