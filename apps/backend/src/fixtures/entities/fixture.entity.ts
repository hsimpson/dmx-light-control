import { pk, timestamps } from '@/db/columns.helpers';
import { sql } from 'drizzle-orm';
import * as d from 'drizzle-orm/pg-core';
import { check, doublePrecision, integer, varchar } from 'drizzle-orm/pg-core';
import fixtureVendor from './fixture-vendor.entity';

const fixture = d.snakeCase.table(
  'fixtures',
  {
    ...pk,
    vendorId: integer()
      .notNull()
      .references(() => fixtureVendor.id),
    name: varchar({ length: 255 }).notNull().unique(),
    weight: doublePrecision(),
    width: doublePrecision(),
    length: doublePrecision(),
    height: doublePrecision(),
    picturePath: varchar({ length: 512 }),
    picture2dPath: varchar({ length: 512 }),
    model3dPath: varchar({ length: 512 }),
    ...timestamps,
  },
  table => [
    check('fixture_weight_non_negative', sql`${table.weight} IS NULL OR ${table.weight} >= 0`),
    check('fixture_width_positive', sql`${table.width} IS NULL OR ${table.width} > 0`),
    check('fixture_length_positive', sql`${table.length} IS NULL OR ${table.length} > 0`),
    check('fixture_height_positive', sql`${table.height} IS NULL OR ${table.height} > 0`),
  ],
);

export default fixture;
