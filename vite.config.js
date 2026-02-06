 import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Add this to allow external access
    open: false, // Don't auto-open
    strictPort: false // Allow port fallback if 5173 is in use
  }
})