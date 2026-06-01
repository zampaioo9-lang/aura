import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        barberia:  resolve(__dirname, 'barberia.html'),
        salon:     resolve(__dirname, 'salon.html'),
        psicologo: resolve(__dirname, 'psicologo.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
