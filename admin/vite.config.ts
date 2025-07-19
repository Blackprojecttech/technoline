import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Вместо require используем ESM-импорты для path и url
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    port: 3200,
    host: true,
    proxy: {
      '/.ai-changelog.json': {
        target: 'http://localhost:3000', // если основной сервер на 3000, иначе поменяй
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/admin/, ''),
      },
      // Прокси для API backend
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    'process.env': {},
  },
}) 