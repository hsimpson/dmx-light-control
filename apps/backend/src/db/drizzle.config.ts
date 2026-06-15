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
  // migrations: {
  //   prefix: 'timestamp',
  // },
});
