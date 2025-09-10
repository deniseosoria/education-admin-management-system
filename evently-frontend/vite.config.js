import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const serverPort = process.env.PORT || 10000;
const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = isProduction 
  ? 'https://evently-5cf6.onrender.com'  // Your production backend URL
  : `http://localhost:${serverPort}`;

console.log(`API URL: ${apiUrl}`);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiUrl
    }
  },
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  publicDir: 'public'
})
