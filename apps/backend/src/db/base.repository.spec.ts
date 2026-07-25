import { relations } from '@/db/relations';
import fixture from '@/fixtures/entities/fixture.entity';
import fixtureVendor from '@/fixtures/entities/fixture-vendor.entity';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, expect, it, vi } from 'vitest';
import { BaseRepository } from './base.repository';

class VendorTestRepository extends BaseRepository<typeof fixtureVendor> {
  public constructor(db: NodePgDatabase<typeof relations>) {
    super(db, fixtureVendor);
  }
}

class FixtureTestRepository extends BaseRepository<typeof fixture> {
  public constructor(db: NodePgDatabase<typeof relations>) {
    super(db, fixture, {
      queryKey: 'fixture',
      with: { fixtureVendor: true },
    });
  }
}

function buildForFindMany() {
  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([{ id: 1 }]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1, publicId: 'p' }]),
  };
  return { repo: new VendorTestRepository(db as never), db };
}

function buildForFindOne() {
  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1, publicId: 'p' }]),
  };
  db.from.mockReturnValue({ where: db.where });
  db.where.mockReturnValue({ limit: db.limit });
  db.limit.mockResolvedValue([{ id: 1, publicId: 'p' }]);
  return { repo: new VendorTestRepository(db as never), db };
}

function buildForMutations() {
  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1, publicId: 'p' }]),
  };
  db.where.mockReturnValue({ returning: db.returning });
  return { repo: new VendorTestRepository(db as never), db };
}

describe('BaseRepository', () => {
  it('findMany selects from the table', async () => {
    const { repo, db } = buildForFindMany();
    expect(await repo.findMany()).toEqual([{ id: 1 }]);
    expect(db.select).toHaveBeenCalled();
    expect(db.from).toHaveBeenCalledWith(fixtureVendor);
  });

  it('findOneByPublicId returns first row or undefined', async () => {
    const { repo, db } = buildForFindOne();
    expect(await repo.findOneByPublicId('p')).toEqual({ id: 1, publicId: 'p' });
    db.limit.mockResolvedValue([]);
    expect(await repo.findOneByPublicId('missing')).toBeUndefined();
  });

  it('createOne inserts and returns first row', async () => {
    const { repo, db } = buildForMutations();
    expect(await repo.createOne({ name: 'Acme' })).toEqual({ id: 1, publicId: 'p' });
    expect(db.insert).toHaveBeenCalledWith(fixtureVendor);
    expect(db.values).toHaveBeenCalledWith({ name: 'Acme' });
  });

  it('updateOneByPublicId updates and returns first row or undefined', async () => {
    const { repo, db } = buildForMutations();
    expect(await repo.updateOneByPublicId('p', { name: 'n' })).toEqual({ id: 1, publicId: 'p' });
    db.returning.mockResolvedValue([]);
    expect(await repo.updateOneByPublicId('p', {})).toBeUndefined();
  });

  it('deleteOneByPublicId returns true when a row was deleted', async () => {
    const { repo, db } = buildForMutations();
    db.returning.mockResolvedValue([{ publicId: 'p' }]);
    expect(await repo.deleteOneByPublicId('p')).toBe(true);
  });

  it('deleteOneByPublicId returns false when nothing deleted', async () => {
    const { repo, db } = buildForMutations();
    db.returning.mockResolvedValue([]);
    expect(await repo.deleteOneByPublicId('p')).toBe(false);
  });

  it('findMany uses relational query when relationalFind is configured', async () => {
    const db = {
      query: {
        fixture: {
          findMany: vi.fn<() => Promise<unknown[]>>().mockResolvedValue(['x']),
          findFirst: vi.fn(),
        },
      },
    };
    const repo = new FixtureTestRepository(db as never);
    expect(await repo.findMany()).toEqual(['x']);
    expect(db.query.fixture.findMany).toHaveBeenCalledWith({ with: { fixtureVendor: true } });
  });

  it('findOneByPublicId uses relational query when relationalFind is configured', async () => {
    const db = {
      query: {
        fixture: {
          findMany: vi.fn(),
          findFirst: vi.fn<() => Promise<unknown>>().mockResolvedValue('x'),
        },
      },
    };
    const repo = new FixtureTestRepository(db as never);
    expect(await repo.findOneByPublicId('p')).toBe('x');
    expect(db.query.fixture.findFirst).toHaveBeenCalledWith({
      where: { publicId: 'p' },
      with: { fixtureVendor: true },
    });
  });
});
