import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8110',
      '/ws': { target: 'ws://localhost:8110', ws: true },
      '/ws-camera-snapshot': { target: 'ws://localhost:8110', ws: true },
    },
  },
  build: {
    outDir: 'adapter/www',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-grid-layout') || id.includes('react-resizable')) return 'grid';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
        },
      },
    },
  },
  base: '/smarthome-dashboard-iii/',
})
