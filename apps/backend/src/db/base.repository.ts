import * as schema from '@/db/schema';
import {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
  InferSelectModel,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { AnyPgTable } from 'drizzle-orm/pg-core';

type Schema = typeof schema;
type TablesWithRelations = ExtractTablesWithRelations<Schema>;

export abstract class BaseRepository<
  TableT extends AnyPgTable,
  TTableName extends keyof TablesWithRelations = keyof TablesWithRelations,
> {
  private readonly queryDb: NodePgDatabase<Schema>;

  public constructor(
    protected readonly db: NodePgDatabase,
    protected readonly table: TableT,
    protected readonly tableName: TTableName,
  ) {
    this.queryDb = db as unknown as NodePgDatabase<Schema>;
  }

  public async findMany(): Promise<InferSelectModel<TableT>[]> {
    // @ts-expect-error - Drizzle generic select type limitation
    return this.db.select().from(this.table);
  }

  public async findManyWithRelations<
    TConfig extends DBQueryConfig<
      'many',
      true,
      TablesWithRelations,
      TablesWithRelations[TTableName]
    >,
  >(
    config?: TConfig,
  ): Promise<
    BuildQueryResult<
      TablesWithRelations,
      TablesWithRelations[TTableName],
      TConfig
    >[]
  > {
    // @ts-expect-error - Drizzle generic relational query type limitation
    return this.queryDb.query[this.tableName].findMany(config);
  }
}
