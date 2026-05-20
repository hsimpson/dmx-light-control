import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AnyPgTable, PgColumn } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm/sql/expressions/conditions';

type TableWithIds = AnyPgTable & { id: PgColumn; externalId: PgColumn };

export abstract class DrizzleRepository {
  public constructor(
    private readonly db: NodePgDatabase,
    private readonly table: TableWithIds,
  ) {}

  public async findById(id: number) {
    return await this.db.select().from(this.table).where(eq(this.table.id, id));
  }

  public async findByExternalId(externalId: string) {
    return await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.externalId, externalId));
  }

  // FIXME: this is not a good idea for large tables, we should add pagination
  public async findAll() {
    return await this.db.select().from(this.table);
  }

  // TODO: add create, update, delete methods
}
