import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import fixtureChannelDefinition from './fixture-channel-definition.entity';
import fixtureChannelMode from './fixture-channel-mode.entity';
import fixtureVendor from './fixture-vendor.entity';

const fixture = pgTable('fixtures', {
  ...pk,
  vendorId: integer()
    .notNull()
    .references(() => fixtureVendor.id),
  name: varchar({ length: 255 }).notNull().unique(),

  ...timestamps,
});

export const fixtureRelations = relations(fixture, ({ one, many }) => ({
  fixtureVendor: one(fixtureVendor, {
    fields: [fixture.vendorId],
    references: [fixtureVendor.id],
  }),
  fixtureChannelDefinitions: many(fixtureChannelDefinition),
  fixtureChannelModes: many(fixtureChannelMode),
}));

export type Fixture = typeof fixture.$inferSelect;

export default fixture;
