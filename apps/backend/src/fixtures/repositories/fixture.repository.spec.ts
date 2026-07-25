import { describe, expect, it, vi } from 'vitest';
import { fixtureRelations, FixtureRepository } from './fixture.repository';

function build() {
  const db = {
    query: {
      fixture: {
        findMany: vi.fn<() => Promise<unknown[]>>(),
        findFirst: vi.fn<() => Promise<unknown>>(),
      },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1 }]),
  };
  const repo = new FixtureRepository(db as never);
  return { repo, db };
}

describe('FixtureRepository', () => {
  it('findMany queries with relations', async () => {
    const { repo, db } = build();
    db.query.fixture.findMany.mockResolvedValue(['x']);
    expect(await repo.findMany()).toEqual(['x']);
    expect(db.query.fixture.findMany).toHaveBeenCalledWith({ with: fixtureRelations });
  });

  it('findOneByPublicId queries first by publicId with relations', async () => {
    const { repo, db } = build();
    db.query.fixture.findFirst.mockResolvedValue('x');
    expect(await repo.findOneByPublicId('p')).toBe('x');
    expect(db.query.fixture.findFirst).toHaveBeenCalledWith({
      where: { publicId: 'p' },
      with: fixtureRelations,
    });
  });

  it('inherits updateOneByPublicId from BaseRepository', async () => {
    const { repo, db } = build();
    expect(await repo.updateOneByPublicId('p', { name: 'n' })).toEqual({ id: 1 });
    expect(db.update).toHaveBeenCalled();
    db.returning.mockResolvedValue([]);
    expect(await repo.updateOneByPublicId('p', {})).toBeUndefined();
  });
});
