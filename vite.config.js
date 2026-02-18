import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),
    // Brotli compression for better compression ratios
    compression({
      algorithm: 'brotliCompress',
      threshold: 1024,
      compressionOptions: { level: 11 }
    }),
    // Gzip compression as fallback
    compression({
      algorithm: 'gzip',
      threshold: 1024
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'chart': ['chart.js', 'react-chartjs-2'],
          'icons': ['lucide-react']
        },
        // Better chunk naming for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
        // Additional aggressive minification
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        keep_fargs: false,
        hoist_vars: false,
        if_return: true,
        join_vars: true,
        side_effects: true
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false,
        ecma: 2020
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Inline small assets as base64
    assetsInlineLimit: 4096,
    // Source maps disabled for production
    sourcemap: false,
    // Report compressed size
    reportCompressedSize: true,
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    port: 3000
  },
  // Optimize dependencies loading
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['chart.js', 'react-chartjs-2']
  }
})