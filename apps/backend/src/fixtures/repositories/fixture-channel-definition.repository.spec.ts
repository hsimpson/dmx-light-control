import { describe, expect, it, vi } from 'vitest';
import {
  fixtureChannelDefinitionRelations,
  FixtureChannelDefinitionRepository,
} from './fixture-channel-definition.repository';

function build() {
  const db = {
    query: {
      fixtureChannelDefinition: {
        findMany: vi.fn<() => Promise<unknown[]>>(),
        findFirst: vi.fn<() => Promise<unknown>>(),
      },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 1 }]),
  };
  const repo = new FixtureChannelDefinitionRepository(db as never);
  return { repo, db };
}

describe('FixtureChannelDefinitionRepository', () => {
  it('loads fixtureChannelRanges', () => {
    expect(fixtureChannelDefinitionRelations).toEqual({
      fixtureChannelRanges: true,
    });
  });

  it('findOneByPublicId queries first by publicId with relations', async () => {
    const { repo, db } = build();
    db.query.fixtureChannelDefinition.findFirst.mockResolvedValue('x');
    expect(await repo.findOneByPublicId('p')).toBe('x');
    expect(db.query.fixtureChannelDefinition.findFirst).toHaveBeenCalledWith({
      where: { publicId: 'p' },
      with: fixtureChannelDefinitionRelations,
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
