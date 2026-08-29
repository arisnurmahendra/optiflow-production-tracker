import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Memaksa aset menjadi base64/inline
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false, // Jangan pisahkan CSS
    brotliSize: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./Index.html', import.meta.url)),
      output: {
        manualChunks: undefined, // Matikan chunking, satukan semuanya
      },
    },
  },
});
