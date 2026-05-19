import { integer, pgTable } from 'drizzle-orm/pg-core';

const fixture = pgTable('fixture', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
});

export type Fixture = typeof fixture.$inferSelect;

export default fixture;
