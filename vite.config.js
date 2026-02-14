import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/forex': {
        target: 'https://www.nrb.org.np',
        changeOrigin: true,
        rewrite: (path) => {
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          return `/api/forex/v1/rates?from=${startDate}&to=${endDate}&per_page=100&page=1`;
        },
      },
    },
  },
})
