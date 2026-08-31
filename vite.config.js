import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    port: 5173,
    open: false,
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
