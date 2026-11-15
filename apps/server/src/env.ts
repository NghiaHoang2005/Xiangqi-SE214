import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Loads the repo-root .env for local runs (`pnpm dev`, `pnpm db:migrate`).
 * Docker and CI pass real environment variables and have no .env, so this is a no-op there.
 * Variables already set in the environment always win.
 */
export function loadDotEnv(start = process.cwd()): void {
  let dir = start;
  for (let i = 0; i < 4; i++) {
    const file = join(dir, '.env');
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
    dir = dirname(dir);
  }
}
