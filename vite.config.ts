import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  if (mode === 'plugin') {
    return {
      build: {
        emptyOutDir: false,
        outDir: 'dist',
        lib: {
          entry: resolve(__dirname, 'src/plugin/controller.ts'),
          formats: ['iife'],
          name: 'plugin',
          fileName: () => 'plugin.js',
        },
      },
    }
  }

  return {
    plugins: [react(), viteSingleFile()],
    root: 'src/ui',
    build: {
      emptyOutDir: false,
      outDir: resolve(__dirname, 'dist'),
      rollupOptions: {
        input: resolve(__dirname, 'src/ui/index.html'),
      },
    },
  }
})
