import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI / icon libraries
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          // Chart libraries
          'vendor-charts': ['recharts'],
          // 3D / heavy libraries
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          // Date utilities
          'vendor-date': ['date-fns'],
        },
      },
    },
  },
  preview: {
    port: 4173,
  }
})

