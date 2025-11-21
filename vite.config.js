import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app.html'),
        landing: resolve(__dirname, 'landing.html')
      }
    }
  }
});