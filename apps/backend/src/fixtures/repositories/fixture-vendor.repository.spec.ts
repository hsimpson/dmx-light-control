import { describe, expect, it, vi } from 'vitest';
import { FixtureVendorRepository } from './fixture-vendor.repository';

function build() {
  const db = {
    query: {
      fixtureVendor: {
        findMany: vi.fn<() => Promise<unknown[]>>(),
        findFirst: vi.fn<() => Promise<unknown>>(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1 }]),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const repo = new FixtureVendorRepository(db as never);
  return { repo, db };
}

describe('FixtureVendorRepository', () => {
  it('findMany returns all vendors', async () => {
    const { repo, db } = build();
    db.query.fixtureVendor.findMany.mockResolvedValue(['v']);
    expect(await repo.findMany()).toEqual(['v']);
  });

  it('findOneByPublicId queries first', async () => {
    const { repo, db } = build();
    db.query.fixtureVendor.findFirst.mockResolvedValue('v');
    expect(await repo.findOneByPublicId('p')).toBe('v');
  });

  it('findOneByName queries first by name', async () => {
    const { repo, db } = build();
    db.query.fixtureVendor.findFirst.mockResolvedValue('v');
    expect(await repo.findOneByName('n')).toBe('v');
  });

  it('createOne inserts and returns first row', async () => {
    const { repo, db } = build();
    expect(await repo.createOne({ name: 'n' })).toEqual({ id: 1 });
    expect(db.insert).toHaveBeenCalled();
    expect(db.values).toHaveBeenCalledWith({ name: 'n' });
  });

  it('deleteOneByPublicId returns true when a row was deleted', async () => {
    const { repo, db } = build();
    expect(await repo.deleteOneByPublicId('p')).toBe(true);
    expect(db.delete).toHaveBeenCalled();
    expect(db.where).toHaveBeenCalled();
  });

  it('deleteOneByPublicId returns false when nothing deleted', async () => {
    const { repo, db } = build();
    db.returning.mockResolvedValue([]);
    expect(await repo.deleteOneByPublicId('p')).toBe(false);
  });
});
