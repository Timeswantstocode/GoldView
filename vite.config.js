import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to make CSS non-render-blocking
function nonBlockingCssPlugin() {
  return {
    name: 'non-blocking-css',
    transformIndexHtml(html) {
      // Replace stylesheet links with preload + onload pattern and add noscript fallback
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        '<link rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'" href="$1">\n    <noscript><link rel="stylesheet" href="$1"></noscript>'
      )
    }
  }
}

export default defineConfig({
  plugins: [react(), nonBlockingCssPlugin()],
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