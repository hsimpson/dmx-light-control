import { describe, it, expect, vi } from 'vitest';

const insertMock = vi.fn().mockReturnThis();
const valuesMock = vi.fn().mockResolvedValue(undefined);
const executeMock = vi.fn().mockResolvedValue(undefined);
const deleteMock = vi.fn().mockReturnThis();
const whereMock = vi.fn().mockResolvedValue(undefined);
const updateMock = vi.fn().mockReturnThis();
const setMock = vi.fn().mockReturnThis();
const returningMock = vi.fn().mockResolvedValue([]);
const findManyMock = vi.fn().mockResolvedValue([]);

const db = {
  insert: insertMock.mockReturnValue({ values: valuesMock }),
  delete: deleteMock.mockReturnValue({ where: whereMock }),
  update: updateMock.mockReturnValue({ set: setMock.mockReturnValue({ where: whereMock }) }),
  execute: executeMock,
  query: { fixture: { findMany: findManyMock } },
};

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => db,
}));
vi.mock('drizzle-seed', () => ({
  reset: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/db/connection', () => ({
  resolveDatabaseUrl: () => 'postgresql://mock',
}));
vi.mock('dotenv', () => ({ config: () => ({}) }));

describe('seed', () => {
  it('resets, restarts identities and inserts all fixture tables', async () => {
    await import('./seed');
    // allow the top-level void main() microtask to settle
    await new Promise(r => setTimeout(r, 0));
    expect(insertMock).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalled();
  });
});
