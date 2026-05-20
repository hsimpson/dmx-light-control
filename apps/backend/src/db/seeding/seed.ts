import { resolveDatabaseUrl } from '@/db/connection';
import * as schema from '@/db/schema';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { reset, seed } from 'drizzle-seed';

async function main() {
  const db = drizzle({
    connection: resolveDatabaseUrl(),
    casing: 'snake_case',
  });
  await reset(db, schema);
  await seed(db, schema).refine((f) => ({
    vendor: {
      columns: {
        name: f.companyName(),
      },
      count: 3,
      with: {
        fixture: 5,
      },
    },
  }));
}

void main();
