// Runs the Prisma CLI with the repo-root .env loaded (Prisma itself only looks next to the
// schema). Variables already in the environment win, so Docker and CI are unaffected.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '..', '..', '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
const { status } = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: join(here, '..'),
});
process.exit(status ?? 1);
