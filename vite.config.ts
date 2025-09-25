import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget-entry.tsx'),
      name: 'MapsyWidget',
      formats: ['iife'],
      fileName: () => 'mapsy-widget.js'
    },
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'mapsy-widget.js',
        name: 'MapsyWidget'
      },
      external: [],
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    cssCodeSplit: false
  }
});