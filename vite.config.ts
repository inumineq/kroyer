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
        // Figma's plugin sandbox parses with an older JS engine that
        // doesn't accept ?. or ?? — transpile down to ES2017 to avoid
        // "Syntax error on line 1: Unexpected token ?"
        target: 'es2017',
        minify: 'esbuild',
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
