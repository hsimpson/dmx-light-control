import { describe, expect, it, vi } from 'vitest';
import { FixtureVendorRepository } from './fixture-vendor.repository';

function build() {
  const db = {
    query: {
      fixtureVendor: {
        findFirst: vi.fn<() => Promise<unknown>>(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue(['v']),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(['v']),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1 }]),
  };
  db.where.mockReturnValue({
    returning: db.returning,
  });
  const repo = new FixtureVendorRepository(db as never);
  return { repo, db };
}

describe('FixtureVendorRepository', () => {
  it('findOneByName queries first by name', async () => {
    const { repo, db } = build();
    db.query.fixtureVendor.findFirst.mockResolvedValue('v');
    expect(await repo.findOneByName('n')).toBe('v');
  });

  it('inherits createOne from BaseRepository', async () => {
    const { repo, db } = build();
    expect(await repo.createOne({ name: 'n' })).toEqual({ id: 1 });
    expect(db.insert).toHaveBeenCalled();
    expect(db.values).toHaveBeenCalledWith({ name: 'n' });
  });

  it('inherits deleteOneByPublicId from BaseRepository', async () => {
    const { repo, db } = build();
    db.returning.mockResolvedValue([{ publicId: 'p' }]);
    expect(await repo.deleteOneByPublicId('p')).toBe(true);
    db.returning.mockResolvedValue([]);
    expect(await repo.deleteOneByPublicId('p')).toBe(false);
  });
});
