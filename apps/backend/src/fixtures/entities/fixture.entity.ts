import { pk, timestamps } from '@/db/columns.helpers';
import { relations } from 'drizzle-orm';
import { integer, pgTable, unique, varchar } from 'drizzle-orm/pg-core';
import channelAssignment from './channel-assignment.entity';
import vendor from './vendor.entity';

const fixture = pgTable(
  'fixtures',
  {
    ...pk,
    vendorId: integer()
      .notNull()
      .references(() => vendor.id),
    name: varchar({ length: 255 }).notNull().unique(),

    ...timestamps,
  },
  (table) => [unique().on(table.externalId)],
);

export const fixtureRelations = relations(fixture, ({ one, many }) => ({
  vendor: one(vendor, {
    fields: [fixture.vendorId],
    references: [vendor.id],
  }),
  channelAssignments: many(channelAssignment),
}));

export type Fixture = typeof fixture.$inferSelect;

export default fixture;
