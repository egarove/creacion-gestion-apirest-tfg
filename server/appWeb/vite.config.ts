import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/get-all-apis': {
        target: 'http://api:8000',
        changeOrigin: true
      },
      '^/(?!src|node_modules|@vite|@react-refresh|assets|favicon.ico).*': {
        target: 'http://api:8000',
        changeOrigin: true,
        bypass: function (req) {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        }
      }
    }
  }
})
