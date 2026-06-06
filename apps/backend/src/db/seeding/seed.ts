import { resolveDatabaseUrl } from '@/db/connection';
import * as schema from '@/db/schema';
import 'dotenv/config';
import { getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';
import { reset } from 'drizzle-seed';
import { fixtureChannelAssignments } from './data/fixtures/fixture-channel-assignment';
import { fixtureChannelDefinitions } from './data/fixtures/fixture-channel-definitions';
import { fixtureChannelModes } from './data/fixtures/fixture-channel-modes';
import { fixtureChannelRanges } from './data/fixtures/fixture-channel-ranges';
import { fixtureVendors } from './data/fixtures/fixture-vendors';
import { fixtures } from './data/fixtures/fixtures';

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
      await db.execute(sql.raw(`ALTER TABLE "${name}" ALTER COLUMN id RESTART WITH 1`));
    }
  }

  // fixture data
  await db.insert(schema.fixtureVendor).values(fixtureVendors);
  await db.insert(schema.fixture).values(fixtures);
  await db.insert(schema.fixtureChannelMode).values(fixtureChannelModes);
  await db.insert(schema.fixtureChannelDefinition).values(fixtureChannelDefinitions);
  await db.insert(schema.fixtureChannelRange).values(fixtureChannelRanges);
  await db.insert(schema.fixtureChannelAssignment).values(fixtureChannelAssignments);
}

void main();
