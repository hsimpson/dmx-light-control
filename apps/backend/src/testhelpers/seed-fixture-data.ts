import { resolveDatabaseUrl } from '@/db/connection';
import * as schema from '@/db/schema';
import { fixtureChannelAssignments } from '@/db/seeding/data/fixtures/fixture-channel-assignment';
import { fixtureChannelDefinitions } from '@/db/seeding/data/fixtures/fixture-channel-definitions';
import { fixtureChannelModes } from '@/db/seeding/data/fixtures/fixture-channel-modes';
import { fixtureChannelRanges } from '@/db/seeding/data/fixtures/fixture-channel-ranges';
import { fixtureVendors } from '@/db/seeding/data/fixtures/fixture-vendors';
import { fixtures } from '@/db/seeding/data/fixtures/fixtures';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const seedFixturePublicId = fixtures[0]?.publicId;
if (!seedFixturePublicId) {
  throw new Error('Seed fixture data is missing a publicId');
}

export const SEED_FIXTURE_PUBLIC_ID = seedFixturePublicId;

export async function seedFixtureData(): Promise<void> {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });
  const db = drizzle({ client: pool });

  try {
    const existingVendors = await db.select().from(schema.fixtureVendor);
    if (existingVendors.length > 0) {
      return;
    }

    await db.insert(schema.fixtureVendor).values(fixtureVendors);
    await db.insert(schema.fixture).values(fixtures);
    await db.insert(schema.fixtureChannelMode).values(fixtureChannelModes);
    await db.insert(schema.fixtureChannelDefinition).values(fixtureChannelDefinitions);
    await db.insert(schema.fixtureChannelRange).values(fixtureChannelRanges);
    await db.insert(schema.fixtureChannelAssignment).values(fixtureChannelAssignments);
  } finally {
    await pool.end();
  }
}
