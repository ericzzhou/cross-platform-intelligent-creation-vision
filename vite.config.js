import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  base: './',
  root: resolve(__dirname, 'src/renderer'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    sourcemap: true,
    minify: false,
    target: 'esnext',
  },
  plugins: [
    {
      name: 'copy-preload',
      buildStart() {
        this.emitFile({
          type: 'asset',
          fileName: 'preload.js',
          source: fs.readFileSync('src/preload.js', 'utf-8')
        });
      }
    }
  ],
  server: {
    port: 5173
  },
  publicDir: resolve(__dirname, 'public')
}); 