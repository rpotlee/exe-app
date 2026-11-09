import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts', 'web/**/*.test.ts', 'supabase/functions/_shared/*.test.ts', 'support/*.test.ts'] } });
