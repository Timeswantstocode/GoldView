import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Remove or comment out the base line for Vercel
  // base: '/GoldView/', 
})