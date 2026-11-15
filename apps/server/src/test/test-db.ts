import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../database/options';

/**
 * Tests that need PostgreSQL read TEST_DATABASE_URL and wipe that database, so it must
 * never point at real data. Without it they are skipped (see README "Tests").
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = Boolean(TEST_DATABASE_URL);

/** Fresh schema from the real migrations, so tests also prove the migrations work. */
export async function resetTestDatabase(): Promise<DataSource> {
  const ds = new DataSource({
    ...dataSourceOptions({ DATABASE_URL: TEST_DATABASE_URL }),
    migrationsRun: false,
  });
  await ds.initialize();
  await ds.dropDatabase();
  await ds.runMigrations();
  return ds;
}
