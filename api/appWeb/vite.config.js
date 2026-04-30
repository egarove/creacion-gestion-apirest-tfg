import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Important for docker
    port: 3000,
    allowedHosts: 'all',
    proxy: {
      '/get-all-apis': {
        target: 'http://api:8000',
        changeOrigin: true
      },
      // Proxy any request that doesn't start with /src, /node_modules, /@vite, /@react-refresh, /assets
      '^/(?!src|node_modules|@vite|@react-refresh|assets|favicon.ico).*': {
        target: 'http://api:8000',
        changeOrigin: true,
        bypass: function (req, res, proxyOptions) {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        }
      }
    }
  }
})
