import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                'electron',
                'child_process',
                'fs',
                'path',
                'os',
                'https',
                'http',
                'stream',
                'util',
                'events',
                'zlib',
              ],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
                compact: true,
              },
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
                compact: true,
              },
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
