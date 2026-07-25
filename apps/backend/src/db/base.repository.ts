import { relations } from '@/db/relations';
import { eq, InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';

type PgTableWithPublicId = PgTable & {
  readonly publicId: AnyPgColumn;
};

type RelationsQuery = NodePgDatabase<typeof relations>['query'];
export type RelationsQueryKey = keyof RelationsQuery;

export type RelationalFindOptions = {
  queryKey: RelationsQueryKey;
  with: Record<string, unknown>;
};

type RelationalQueryApi = {
  findMany: (args: { with: Record<string, unknown> }) => Promise<unknown[]>;
  findFirst: (args: { where: { publicId: string }; with: Record<string, unknown> }) => Promise<unknown>;
};

function relationalQuery(db: NodePgDatabase<typeof relations>, queryKey: RelationsQueryKey): RelationalQueryApi {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Drizzle relational query key indexing
  return db.query[queryKey] as unknown as RelationalQueryApi;
}

function publicIdColumn(table: PgTable): AnyPgColumn {
  return (table as unknown as PgTableWithPublicId).publicId;
}

/**
 * Shared Drizzle CRUD for entities that use `pk.publicId`.
 * Not a Nest provider — extend from concrete @Injectable() repositories.
 * Pass `relationalFind` to load nested `with` graphs on findMany/findOneByPublicId.
 */
export abstract class BaseRepository<TTable extends PgTable> {
  protected constructor(
    protected readonly db: NodePgDatabase<typeof relations>,
    protected readonly table: TTable,
    private readonly relationalFind?: RelationalFindOptions,
  ) {}

  public async findMany(): Promise<InferSelectModel<TTable>[]> {
    if (this.relationalFind) {
      const { queryKey, with: withRelations } = this.relationalFind;
      return (await relationalQuery(this.db, queryKey).findMany({ with: withRelations })) as InferSelectModel<TTable>[];
    }

    // Drizzle's `from()` typing does not accept generic `TTable extends PgTable` without assertion.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Drizzle generic table constraint
    return (await this.db.select().from(this.table as PgTable)) as InferSelectModel<TTable>[];
  }

  public async findOneByPublicId(publicId: string): Promise<InferSelectModel<TTable> | undefined> {
    if (this.relationalFind) {
      const { queryKey, with: withRelations } = this.relationalFind;
      return (await relationalQuery(this.db, queryKey).findFirst({
        where: { publicId },
        with: withRelations,
      })) as InferSelectModel<TTable> | undefined;
    }

    const rows = await this.db
      .select()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Drizzle generic table constraint
      .from(this.table as PgTable)
      .where(eq(publicIdColumn(this.table), publicId))
      .limit(1);
    return rows[0] as InferSelectModel<TTable> | undefined;
  }

  public async createOne(data: InferInsertModel<TTable>): Promise<InferSelectModel<TTable> | undefined> {
    const rows = (await this.db.insert(this.table).values(data).returning()) as InferSelectModel<TTable>[];
    return rows[0];
  }

  public async updateOneByPublicId(
    publicId: string,
    data: Partial<InferInsertModel<TTable>>,
  ): Promise<InferSelectModel<TTable> | undefined> {
    const rows = (await this.db
      .update(this.table)
      .set(data)
      .where(eq(publicIdColumn(this.table), publicId))
      .returning()) as InferSelectModel<TTable>[];
    return rows[0];
  }

  public async deleteOneByPublicId(publicId: string): Promise<boolean> {
    const publicIdCol = publicIdColumn(this.table);
    const deleted = await this.db
      .delete(this.table)
      .where(eq(publicIdCol, publicId))
      .returning({ publicId: publicIdCol });
    return deleted.length > 0;
  }
}
