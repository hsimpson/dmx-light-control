import { describe, expect, it, vi } from 'vitest';
import { ProjectRepository } from './project.repository';

function build() {
  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue(['p']),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(['p']),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1 }]),
  };
  db.where.mockReturnValue({
    returning: db.returning,
    limit: db.limit,
  });
  const repo = new ProjectRepository(db as never);
  return { repo, db };
}

describe('ProjectRepository', () => {
  it('inherits findMany from BaseRepository', async () => {
    const { repo, db } = build();
    expect(await repo.findMany()).toEqual(['p']);
    expect(db.select).toHaveBeenCalled();
    expect(db.from).toHaveBeenCalled();
  });

  it('inherits createOne from BaseRepository', async () => {
    const { repo, db } = build();
    expect(await repo.createOne({ name: 'n' })).toEqual({ id: 1 });
    expect(db.insert).toHaveBeenCalled();
    expect(db.values).toHaveBeenCalledWith({ name: 'n' });
  });

  it('inherits updateOneByPublicId from BaseRepository', async () => {
    const { repo, db } = build();
    db.returning.mockResolvedValue([{ name: 'n' }]);
    expect(await repo.updateOneByPublicId('id', { name: 'n' })).toEqual({ name: 'n' });
    expect(db.update).toHaveBeenCalled();
    expect(db.set).toHaveBeenCalledWith({ name: 'n' });
  });

  it('inherits deleteOneByPublicId from BaseRepository', async () => {
    const { repo, db } = build();
    db.returning.mockResolvedValue([{ publicId: 'p' }]);
    expect(await repo.deleteOneByPublicId('p')).toBe(true);
    db.returning.mockResolvedValue([]);
    expect(await repo.deleteOneByPublicId('p')).toBe(false);
  });
});
