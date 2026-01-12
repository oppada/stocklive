import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/uapi': {
        target: 'https://openapi.koreainvestment.com:9443',
        changeOrigin: true,
        secure: false
      }
    }
  }
})