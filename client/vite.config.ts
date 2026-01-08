// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /uapi로 오는 요청을 한국투자증권으로 토스
      '/uapi': {
        target: 'https://openapi.koreainvestment.com:9443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})