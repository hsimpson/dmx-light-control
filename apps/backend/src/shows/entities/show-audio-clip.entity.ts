import { pk, timestamps } from '@/db/columns.helpers';
import show from '@/shows/entities/show.entity';
import * as d from 'drizzle-orm/pg-core';
import { jsonb, varchar } from 'drizzle-orm/pg-core';

/** One uploaded audio file on a show's audio track; its decoded PCM lives on disk under the clip's publicId. */
const showAudioClip = d.snakeCase.table('show_audio_clips', {
  ...pk,
  showId: d
    .integer()
    .notNull()
    .references(() => show.id, { onDelete: 'cascade' }),
  fileName: varchar({ length: 255 }).notNull(),
  startMs: d.integer().notNull(),
  durationMs: d.integer().notNull(),
  beatsMs: jsonb().$type<number[]>().notNull(),
  peaks: jsonb().$type<number[]>().notNull(),
  ...timestamps,
});

export default showAudioClip;
