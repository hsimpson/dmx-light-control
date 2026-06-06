import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { pgTable, varchar } from 'drizzle-orm/pg-core';
import fixture from './fixture.entity';

const fixtureVendor = pgTable('fixture_vendors', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export const fixtureVendorRelations = relations(fixtureVendor, ({ many }) => ({
  fixtures: many(fixture),
}));

export type FixtureVendor = typeof fixtureVendor.$inferSelect;

export default fixtureVendor;
