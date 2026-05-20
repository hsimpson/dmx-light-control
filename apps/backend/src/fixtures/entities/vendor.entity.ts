import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { pgTable, varchar } from 'drizzle-orm/pg-core';
import fixture from './fixture.entity';

const vendor = pgTable('vendor', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export const vendorRelations = relations(vendor, ({ many }) => ({
  fixtures: many(fixture),
}));

export type Vendor = typeof vendor.$inferSelect;

export default vendor;
