import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          if (id.includes('@tanstack/react-query') || id.includes('zustand') || id.includes('/axios/')) return 'vendor-state'
          if (id.includes('react-hook-form') || id.includes('/zod/') || id.includes('@hookform/resolvers')) return 'vendor-forms'
          if (id.includes('lucide-react') || id.includes('react-hot-toast') || id.includes('/clsx/') || id.includes('tailwind-merge')) return 'vendor-ui'
          if (id.includes('/recharts/')) return 'vendor-charts'
          if (id.includes('@mui/material') || id.includes('@emotion/react') || id.includes('@emotion/styled')) return 'vendor-mui'
          return 'vendor-misc'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
