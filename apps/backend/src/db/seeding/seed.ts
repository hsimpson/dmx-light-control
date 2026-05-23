import { resolveDatabaseUrl } from '@/db/connection';
import * as schema from '@/db/schema';
import 'dotenv/config';
import { getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';
import { reset } from 'drizzle-seed';
import { channelAssignments } from './data/channel-assignment';
import { fixtures } from './data/fixtures';
import { vendors } from './data/vendors';

async function main() {
  const db = drizzle({
    connection: resolveDatabaseUrl(),
    casing: 'snake_case',
  });

  await reset(db, schema);

  // Restart identity sequences so PKs begin at 1 again after truncation
  for (const value of Object.values(schema)) {
    if (value instanceof PgTable) {
      const name = getTableName(value);
      await db.execute(
        sql.raw(`ALTER TABLE "${name}" ALTER COLUMN id RESTART WITH 1`),
      );
    }
  }

  await db.insert(schema.vendor).values(vendors);
  await db.insert(schema.fixture).values(fixtures);
  await db.insert(schema.channelAssignment).values(channelAssignments);
}

void main();
