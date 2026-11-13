import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), {
    name: 'exclude-local-audio-archive',
    closeBundle() { rmSync(resolve('dist/audio.zip'), { force: true }); },
  }],
  base: './',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: { output: { manualChunks(id) {
      if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor';
      if (id.includes('node_modules/lucide-react/')) return 'icons';
    } } },
  },
  server: { port: 5173, strictPort: false },
});
