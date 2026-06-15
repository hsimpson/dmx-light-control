import { pk, timestamps } from '@/db/columns.helpers';
import * as d from 'drizzle-orm/pg-core';
import { integer, varchar } from 'drizzle-orm/pg-core';
import fixtureVendor from './fixture-vendor.entity';

const fixture = d.snakeCase.table('fixtures', {
  ...pk,
  vendorId: integer()
    .notNull()
    .references(() => fixtureVendor.id),
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export default fixture;
