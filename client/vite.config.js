// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 주소를 /api/uapi로 변경하여 App.tsx와 맞춤
      '/api/uapi': {
        target: 'https://openapi.koreainvestment.com:9443',
        changeOrigin: true,
        secure: false,
        // 중요: 실제 증권사 서버에는 앞에 붙은 /api/uapi를 떼고 전달해야 함
        rewrite: (path) => {
          if (path.startsWith('/api/uapi/oauth2/tokenP')) {
            return path.replace('/api/uapi', '');
          }
          return path.replace('/api', '');
        },
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Host', 'openapi.koreainvestment.com');
          });
        }
      }
    }
  }
})