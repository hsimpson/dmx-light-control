import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { pgTable, unique, varchar } from 'drizzle-orm/pg-core';
import fixture from './fixture.entity';

const vendor = pgTable(
  'vendors',
  {
    ...pk,
    name: varchar({ length: 255 }).notNull().unique(),

    ...timestamps,
  },
  (table) => [unique().on(table.externalId)],
);

export const vendorRelations = relations(vendor, ({ many }) => ({
  fixtures: many(fixture),
}));

export type Vendor = typeof vendor.$inferSelect;

export default vendor;
