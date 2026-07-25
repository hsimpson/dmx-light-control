import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPoolEnd, mockSelect, mockFrom, mockInsert, mockValues, mockDrizzle, mockResolveDatabaseUrl } = vi.hoisted(
  () => {
    const poolEnd = vi.fn().mockResolvedValue(undefined);
    const from = vi.fn();
    const select = vi.fn(() => ({ from }));
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const drizzle = vi.fn();
    const resolveDatabaseUrl = vi.fn(() => 'postgresql://test');

    return {
      mockPoolEnd: poolEnd,
      mockSelect: select,
      mockFrom: from,
      mockInsert: insert,
      mockValues: values,
      mockDrizzle: drizzle,
      mockResolveDatabaseUrl: resolveDatabaseUrl,
    };
  },
);

vi.mock('pg', () => ({
  Pool: class {
    public end = mockPoolEnd;
  },
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: mockDrizzle,
}));

vi.mock('@/db/connection', () => ({
  resolveDatabaseUrl: mockResolveDatabaseUrl,
}));

describe('seedFixtureData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrizzle.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
    mockFrom.mockResolvedValue([]);
    mockValues.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exports the seed fixture public id from fixture seed data', async () => {
    const { SEED_FIXTURE_PUBLIC_ID } = await import('./seed-fixture-data');

    expect(SEED_FIXTURE_PUBLIC_ID).toBe('aadb2d60-4a8e-45c3-b58a-8726861930b1');
  });

  it('inserts all fixture tables when no vendors exist', async () => {
    const { seedFixtureData } = await import('./seed-fixture-data');

    await seedFixtureData();

    expect(mockResolveDatabaseUrl).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledTimes(6);
    expect(mockValues).toHaveBeenCalledTimes(6);
    expect(mockPoolEnd).toHaveBeenCalled();
  });

  it('skips inserts when vendors already exist', async () => {
    mockFrom.mockResolvedValue([{ id: 1 }]);

    const { seedFixtureData } = await import('./seed-fixture-data');

    await seedFixtureData();

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalled();
  });

  it('throws when seed fixture data is missing a publicId', async () => {
    vi.resetModules();
    vi.doMock('@/db/seeding/data/fixtures/fixtures', () => ({
      fixtures: [{}],
    }));

    await expect(import('./seed-fixture-data')).rejects.toThrow('Seed fixture data is missing a publicId');

    vi.doUnmock('@/db/seeding/data/fixtures/fixtures');
    vi.resetModules();
  });

  it('closes the pool when seeding fails', async () => {
    mockFrom.mockRejectedValue(new Error('select failed'));

    const { seedFixtureData } = await import('./seed-fixture-data');

    await expect(seedFixtureData()).rejects.toThrow('select failed');
    expect(mockPoolEnd).toHaveBeenCalled();
  });
});
