import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC lets Vitest handle NestJS decorator metadata.
export default defineConfig({
  plugins: [swc.vite()],
  test: { include: ['src/**/*.test.ts'] },
});
