import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
      },
      {
        entry: 'electron/preload.cjs',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs'
              }
            }
          }
        }
      }
    ]),
  ],
})
