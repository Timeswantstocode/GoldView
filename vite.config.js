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
          'icons': ['lucide-react'],
          'html-to-image': ['html-to-image']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    target: 'es2020',
    modulePreload: {
      polyfill: false
    },
    cssCodeSplit: false,
    assetsInlineLimit: 4096
  },
  server: {
    port: 3000
  },
  css: {
    devSourcemap: false
  }
})