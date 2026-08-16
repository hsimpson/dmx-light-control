import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';

export const timestamps: {
  createdAt: ReturnType<typeof timestamp>;
  updatedAt: ReturnType<typeof timestamp>;
} = {
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const pk: {
  id: ReturnType<typeof integer>;
  publicId: ReturnType<typeof uuid>;
} = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  publicId: uuid().notNull().defaultRandom().unique(),
};
