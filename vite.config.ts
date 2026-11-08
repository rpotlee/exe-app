import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The new app lives in web/. It shares src/ (domain logic, stores, generated database types) with the tests.
export default defineConfig({
  root: 'web',
  envDir: '..',
  plugins: [react()],
  server: { port: 5173, host: true, fs: { allow: ['..'] } },
  build: {
    outDir: '../dist', emptyOutDir: true,
    // Big libraries get their own files: they change rarely, so a returning visitor keeps them cached when the app changes.
    rollupOptions: { output: { manualChunks: (id: string) => (id.includes('node_modules/@supabase') ? 'supabase' : /node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined) } },
  },
});
