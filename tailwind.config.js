/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.js', // Garante que ele leia todos os arquivos .js em src
    './src/**/*.html', // Garante que ele leia qualquer outro .html em src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}