import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is forwarded to the NestJS backend on port 3000.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
