/// <reference types="vitest/globals" />
import { vi } from 'vitest';
import { FixtureRepository } from './fixture.repository';

function build() {
  const db = {
    query: {
      fixture: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  };
  const repo = new FixtureRepository(db as never);
  return { repo, db };
}

describe('FixtureRepository', () => {
  it('findMany queries with relations', async () => {
    const { repo, db } = build();
    (db.query.fixture.findMany as any).mockResolvedValue(['x']);
    expect(await repo.findMany()).toEqual(['x']);
  });

  it('findOneByPublicId queries first by publicId', async () => {
    const { repo, db } = build();
    (db.query.fixture.findFirst as any).mockResolvedValue('x');
    expect(await repo.findOneByPublicId('p')).toBe('x');
  });

  it('updateOneByPublicId updates and returns first row', async () => {
    const { repo, db } = build();
    expect(await repo.updateOneByPublicId('p', { name: 'n' } as never)).toEqual({ id: 1 });
    expect(db.update).toHaveBeenCalled();
    expect(db.where).toHaveBeenCalled();
  });

  it('updateOneByPublicId returns undefined when no row', async () => {
    const { repo, db } = build();
    (db.returning as any).mockResolvedValue([]);
    expect(await repo.updateOneByPublicId('p', {} as never)).toBeUndefined();
  });
});
