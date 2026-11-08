import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The new app lives in web/. It shares src/ (domain logic, stores, generated database types) with the tests.
export default defineConfig({
  root: 'web',
  envDir: '..',
  plugins: [react()],
  server: { port: 5173, host: true, fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
});
