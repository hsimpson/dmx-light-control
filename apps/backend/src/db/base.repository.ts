import * as schema from '@/db/schema';
import { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import { AnyPgTable } from 'drizzle-orm/pg-core';

type Schema = typeof schema;
type TablesWithRelations = ExtractTablesWithRelations<Schema>;

// Helper types to reduce complexity in repository methods
type OneConfig<TTableName extends keyof TablesWithRelations> = DBQueryConfig<
  'one',
  true,
  TablesWithRelations,
  TablesWithRelations[TTableName]
>;

type ManyConfig<TTableName extends keyof TablesWithRelations> = DBQueryConfig<
  'many',
  true,
  TablesWithRelations,
  TablesWithRelations[TTableName]
>;

type QueryResult<
  TTableName extends keyof TablesWithRelations,
  TConfig extends true | Record<string, unknown>,
> = BuildQueryResult<TablesWithRelations, TablesWithRelations[TTableName], TConfig>;

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

  public async findOneByExternalId<TConfig extends OneConfig<TTableName>>(
    externalId: string,
    config?: TConfig,
  ): Promise<QueryResult<TTableName, TConfig> | undefined> {
    // @ts-expect-error - Drizzle generic relational query type limitation
    return this.queryDb.query[this.tableName].findFirst({
      ...config,
      // @ts-expect-error - All tables have externalId from pk spread
      where: (fields, { eq }) => eq(fields.externalId, externalId),
    });
  }

  public async findMany<TConfig extends ManyConfig<TTableName>>(
    config?: TConfig,
  ): Promise<QueryResult<TTableName, TConfig>[]> {
    // @ts-expect-error - Drizzle generic relational query type limitation
    return this.queryDb.query[this.tableName].findMany(config);
  }
}
