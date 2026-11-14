import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC để vitest hiểu decorator metadata của NestJS.
export default defineConfig({
  plugins: [swc.vite()],
  test: { include: ['src/**/*.test.ts'] },
});
