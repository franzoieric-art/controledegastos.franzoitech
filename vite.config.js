import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // A Home Page
        main: resolve(__dirname, 'index.html'),
        
        // AQUI ESTA A MUDANÇA: Agora geramos um arquivo 'login.html'
        login: resolve(__dirname, 'login.html') 
      }
    }
  }
});