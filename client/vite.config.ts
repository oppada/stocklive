// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv';

dotenv.config({ path: 'C:\\Users\\user\\stocklive\\client\\.env.local' });

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy all /api requests to the Node.js backend server
        '/api': {
          target: 'http://localhost:4000', // Node.js backend server
          changeOrigin: true,
          secure: false, // For development, if backend uses HTTP
          rewrite: (path) => path, // No path rewriting needed if backend routes match
        }
      }
    }
  }
});