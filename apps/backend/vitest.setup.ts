import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

let dbTestContainer: StartedPostgreSqlContainer;

export async function setup() {
  dbTestContainer = await new PostgreSqlContainer('postgres:18.4').start();
  const connectionString = dbTestContainer.getConnectionUri();
  const url = new URL(connectionString);

  process.env.POSTGRES_USER = url.username;
  process.env.POSTGRES_PASSWORD = url.password;
  process.env.POSTGRES_HOST = url.hostname;
  process.env.POSTGRES_PORT = url.port;
  process.env.POSTGRES_DB = url.pathname.substring(1);

  // apply migrations so tests can run against a database with the correct schema
  const client = new Client({ connectionString });
  await client.connect();

  const migrationsDir = resolve(import.meta.dirname, 'src/db/migrations');
  const migrationsDirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  for (const dir of migrationsDirs) {
    const sql = readFileSync(resolve(migrationsDir, dir, 'migration.sql'), 'utf-8');
    await client.query(sql);
  }

  await client.end();
}

export async function teardown() {
  await dbTestContainer?.stop();
}
