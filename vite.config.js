import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  // A LINHA MAIS IMPORTANTE: Diz ao Vite para procurar os arquivos dentro da pasta 'src'
  root: 'src', 
  
  build: {
    // Diz ao Vite para criar a pasta 'dist' fora da 'src'
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      // Garante que o Vite encontre suas duas páginas
      input: {
        main: resolve(__dirname, 'src/index.html'),
        ajuda: resolve(__dirname, 'src/ajuda.html')
      }
    }
  }
})