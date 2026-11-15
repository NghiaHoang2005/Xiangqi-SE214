import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC lets Vitest handle NestJS decorator metadata.
export default defineConfig({
  plugins: [swc.vite()],
  // Database tests share one TEST_DATABASE_URL, so test files run one at a time.
  test: { include: ['src/**/*.test.ts'], fileParallelism: false },
});
