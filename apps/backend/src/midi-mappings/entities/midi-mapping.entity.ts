import { pk, timestamps } from '@/db/columns.helpers';
import type { MidiLedPalettes } from '@/midi-mappings/midi-mapping';
import * as d from 'drizzle-orm/pg-core';
import { jsonb, varchar } from 'drizzle-orm/pg-core';

const midiMapping = d.snakeCase.table('midi_mappings', {
  ...pk,
  name: varchar({ length: 255 }).notNull().unique(),
  ledPalettes: jsonb().$type<MidiLedPalettes>().notNull().default({}),

  ...timestamps,
});

export default midiMapping;
