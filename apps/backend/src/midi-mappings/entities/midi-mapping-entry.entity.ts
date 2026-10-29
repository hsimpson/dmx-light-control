import { pk, timestamps } from '@/db/columns.helpers';
import midiMapping from '@/midi-mappings/entities/midi-mapping.entity';
import { MidiControlType, MidiFeedback, MidiMessageType } from '@/midi-mappings/midi-mapping';
import * as d from 'drizzle-orm/pg-core';
import { jsonb, varchar } from 'drizzle-orm/pg-core';

const controlTypeValues = Object.values(MidiControlType) as [MidiControlType, ...MidiControlType[]];
const messageTypeValues = Object.values(MidiMessageType) as [MidiMessageType, ...MidiMessageType[]];
export const midiControlTypeEnum = d.pgEnum('midi_control_type', controlTypeValues);
export const midiMessageTypeEnum = d.pgEnum('midi_message_type', messageTypeValues);

const midiMappingEntry = d.snakeCase.table(
  'midi_mapping_entries',
  {
    ...pk,
    midiMappingId: d
      .integer()
      .notNull()
      .references(() => midiMapping.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    controlType: midiControlTypeEnum().notNull(),
    messageType: midiMessageTypeEnum().notNull(),
    channel: d.integer().notNull(),
    number: d.integer().notNull(),
    feedback: jsonb().$type<MidiFeedback>(),
    ...timestamps,
  },
  table => [
    d.unique().on(table.midiMappingId, table.name),
    d
      .unique('midi_mapping_entries_address_unique')
      .on(table.midiMappingId, table.messageType, table.channel, table.number),
  ],
);

export default midiMappingEntry;
