import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'extension/public',
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
  },
});
