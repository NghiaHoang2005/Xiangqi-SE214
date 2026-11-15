import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

/**
 * One place for connection settings, used by the Nest module and by the TypeORM CLI.
 * Schema changes only happen through migrations: `synchronize` is always off.
 */
export function dataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');
  return {
    type: 'postgres',
    // gen_random_uuid() is built into PostgreSQL 13+, no extension needed.
    uuidExtension: 'pgcrypto',
    url,
    entities: ENTITIES,
    // Resolves to src/... under tests and dist/... after `nest build`.
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'schema_migrations',
    migrationsRun: env.DB_MIGRATIONS_RUN === 'true',
    synchronize: false,
    logging: env.DB_LOGGING === 'true' ? ['query', 'error'] : ['error'],
  };
}
