import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // A Home Page (Landing Page principal)
        main: resolve(__dirname, 'index.html'),
        
        // O Sistema/Login
        login: resolve(__dirname, 'login.html'),
        
        // A Página da Black Friday (Necessária para o build funcionar)
        blackfriday: resolve(__dirname, 'blackfriday.html')
      }
    }
  }
});