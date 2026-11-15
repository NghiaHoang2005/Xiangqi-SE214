import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Tests that need PostgreSQL read TEST_DATABASE_URL and wipe that database, so it must
 * never point at real data. Without it they are skipped (see README "Common commands").
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = Boolean(TEST_DATABASE_URL);

const SERVER_DIR = join(__dirname, '..', '..');

/**
 * Drops everything in the test database and applies the real migrations, so the tests
 * also prove the migrations work. Returns a client connected to that database.
 */
export async function resetTestDatabase(): Promise<PrismaClient> {
  execFileSync(
    'pnpm',
    ['exec', 'prisma', 'migrate', 'reset', '--force', '--skip-seed', '--skip-generate'],
    {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    },
  );
  const client = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  await client.$connect();
  return client;
}
