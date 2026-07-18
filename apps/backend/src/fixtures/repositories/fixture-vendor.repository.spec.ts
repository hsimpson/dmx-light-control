/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { FixtureVendorRepository } from './fixture-vendor.repository';

function build() {
  const db = {
    query: { fixtureVendor: { findMany: vi.fn(), findFirst: vi.fn() } },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const repo = new FixtureVendorRepository(db as never);
  return { repo, db };
}

describe('FixtureVendorRepository', () => {
  it('findMany returns all vendors', async () => {
    const { repo, db } = build();
    (db.query.fixtureVendor.findMany as any).mockResolvedValue(['v']);
    expect(await repo.findMany()).toEqual(['v']);
  });

  it('findOneByPublicId queries first', async () => {
    const { repo, db } = build();
    (db.query.fixtureVendor.findFirst as any).mockResolvedValue('v');
    expect(await repo.findOneByPublicId('p')).toBe('v');
  });

  it('findOneByName queries first by name', async () => {
    const { repo, db } = build();
    (db.query.fixtureVendor.findFirst as any).mockResolvedValue('v');
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
    (db.returning as any).mockResolvedValue([]);
    expect(await repo.deleteOneByPublicId('p')).toBe(false);
  });
});
