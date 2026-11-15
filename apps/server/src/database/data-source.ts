import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDotEnv } from '../env';
import { dataSourceOptions } from './options';

loadDotEnv();

/** Entry point for the TypeORM CLI (see `db:*` scripts in apps/server/package.json). */
export default new DataSource(dataSourceOptions());
