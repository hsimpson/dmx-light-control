import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { resolveDatabaseUrl } from './connection';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  // use snake_case for the database columns
  casing: 'snake_case',
  migrations: {
    prefix: 'timestamp',
  },
});
