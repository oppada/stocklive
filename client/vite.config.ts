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
        // Proxy for the local token server
        '/api/uapi/oauth2/tokenP': {
          target: 'http://localhost:3001', // Target the local token server
          changeOrigin: true,
          secure: false, // For development
          rewrite: (path) => path.replace(/^\/api\/uapi\/oauth2\/tokenP/, '/'), // localTokenServer listens on /
          configure: (proxy, options) => {
            // Optional: Log requests hitting this proxy
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Vite Proxy] Redirecting token request to local server:', req.url);
            });
          }
        },
        // General proxy for other KIS API calls
        '/api/uapi': {
          target: 'https://openapi.koreainvestment.com:9443',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/uapi/, '/uapi'),
          headers: {
            'Host': 'openapi.koreainvestment.com'
          }
        }
      }
    }
  }
});