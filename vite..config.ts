
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// import { cartographer } from '@replit/vite-plugin-cartographer';
import runtimeErrorModal from '@replit/vite-plugin-runtime-error-modal';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // cartographer(),
    runtimeErrorModal(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: true,
  },
  root: 'client',
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
