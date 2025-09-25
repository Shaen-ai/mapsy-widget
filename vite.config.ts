import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  },
  define: {
    // Define global constants for browser environment
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production'),
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
    cssCodeSplit: false,
    // Ensure source maps are disabled in production
    sourcemap: false
  },
  // Resolve aliases to prevent Node.js module imports
  resolve: {
    alias: {
      // Prevent Node.js built-ins from being included
      stream: 'stream-browserify',
      path: 'path-browserify'
    }
  },
  // Optimize deps
  optimizeDeps: {
    exclude: ['path', 'fs', 'stream']
  }
});