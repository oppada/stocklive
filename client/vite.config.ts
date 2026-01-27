// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
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
})