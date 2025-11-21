import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // O PULO DO GATO: Chamamos de 'index' aqui para o Vite criar um 'index.html' na saída
        index: resolve(__dirname, 'landing.html'), 
        
        // O App continua como app
        app: resolve(__dirname, 'app.html')
      }
    }
  }
});