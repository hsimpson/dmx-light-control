import { describe, expect, it, vi } from 'vitest';
import { FixtureChannelModeRepository } from './fixture-channel-mode.repository';

function build(existingModes: { id: number; publicId: string }[] = []) {
  const tx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn<() => Promise<unknown[]>>().mockResolvedValue(existingModes),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([{ id: 99 }]),
  };
  const db = {
    transaction: vi.fn(async (fn: (transaction: typeof tx) => Promise<void>) => fn(tx)),
  };
  const repo = new FixtureChannelModeRepository(db as never);
  return { repo, db, tx };
}

describe('FixtureChannelModeRepository', () => {
  it('replaceAllForFixture deletes omitted modes inside a transaction', async () => {
    const { repo, db, tx } = build([
      { id: 1, publicId: 'keep' },
      { id: 2, publicId: 'drop' },
    ]);
    await repo.replaceAllForFixture(7, [{ publicId: 'keep', name: 'kept', assignments: [] }]);
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.delete).toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalled();
  });

  it('replaceAllForFixture inserts new modes and their assignments', async () => {
    const { repo, tx } = build([]);
    await repo.replaceAllForFixture(7, [{ name: 'new', assignments: [{ channelDefinitionId: 10 }] }]);
    expect(tx.insert).toHaveBeenCalled();
    expect(tx.values).toHaveBeenCalled();
    expect(tx.returning).toHaveBeenCalled();
  });
});
