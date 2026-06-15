import { pk, timestamps } from '@/db/columns.helpers';

import { pgTable, varchar } from 'drizzle-orm/pg-core';

const fixtureVendor = pgTable('fixture_vendors', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export default fixtureVendor;
