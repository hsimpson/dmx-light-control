import { InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { AnyPgTable } from 'drizzle-orm/pg-core';

export abstract class BaseRepository<TableT extends AnyPgTable> {
  public constructor(
    protected readonly db: NodePgDatabase,
    protected readonly table: TableT,
  ) {}

  public async findMany(): Promise<InferSelectModel<TableT>[]> {
    // @ts-expect-error - Drizzle generic select type limitation
    return this.db.select().from(this.table);
  }
}
