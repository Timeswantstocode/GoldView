import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'chart': ['chart.js', 'react-chartjs-2'],
          'icons': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      }
    },
    cssMinify: true,
    target: 'es2020',
    modulePreload: {
      polyfill: false
    }
  },
  server: {
    port: 3000
  }
})