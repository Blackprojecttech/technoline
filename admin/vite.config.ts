import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3200,
    strictPort: true,
    watch: {
      usePolling: true
    },
    allowedHosts: [
      'localhost',
      'technoline-admin.loca.lt'
    ]
  },
  preview: {
    port: 3200,
    strictPort: true,
    host: '0.0.0.0'
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@ant-design/icons'],
          antd: ['antd']
        }
      }
    }
  }
}); 