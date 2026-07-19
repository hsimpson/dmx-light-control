import { describe, it, expect, vi, type Mock, afterEach } from 'vitest';

const writeFileSync: Mock<(path: string, data: string) => void> = vi.fn();
const mkdirSync: Mock<(path: string) => void> = vi.fn();

vi.mock('node:fs', () => ({
  mkdirSync,
  writeFileSync,
}));
vi.mock('node:path', async () => {
  const actual = await vi.importActual<typeof import('node:path')>('node:path');
  return {
    ...actual,
    resolve: (...args: string[]) => args.join('/'),
  };
});

describe('generate-erd', () => {
  const ORIGINAL_ARGV = process.argv;

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
    vi.clearAllMocks();
  });

  it('writes a mermaid ER diagram to the default path', async () => {
    await import('./generate-erd');
    expect(mkdirSync).toHaveBeenCalled();
    expect(writeFileSync).toHaveBeenCalled();
    const content = writeFileSync.mock.calls[0]?.[1];
    expect(content).toContain('```mermaid');
    expect(content).toContain('erDiagram');
  });

  it('honors the --out flag', async () => {
    process.argv = ['node', 'generate-erd.ts', '--out', 'custom/out.md'];
    vi.resetModules();
    await import('./generate-erd');
    expect(writeFileSync.mock.calls[0]?.[0]).toBe('custom/out.md');
  });

  it('falls back to "id" label and "unknown" type for degenerate schema', async () => {
    const { PgTable: PgTableClass } = await import('drizzle-orm/pg-core');
    const S = (key: string) => Symbol.for(`drizzle:${key}`);
    const fakeColumn = {
      name: 'blank',
      notNull: false,
      primary: false,
      getSQLType: () => '!!!',
    };
    const fakeTable = Object.create(PgTableClass.prototype);
    fakeTable[S('Name')] = 'weird';
    fakeTable[S('Schema')] = undefined;
    fakeTable[S('Columns')] = { blank: fakeColumn };
    fakeTable[S('ExtraConfigColumns')] = {};
    fakeTable[S('ExtraConfigBuilder')] = undefined;
    fakeTable[S('EnableRLS')] = undefined;
    fakeTable[S('PgInlineForeignKeys')] = [
      {
        reference: () => ({ foreignTable: { name: 'parent' }, columns: [], foreignColumns: [] }),
      },
    ];
    vi.doMock('@/db/schema', () => ({ weird: fakeTable }));
    process.argv = ['node', 'generate-erd.ts', '--out', 'degenerate/out.md'];
    vi.resetModules();
    await import('./generate-erd');
    const content = writeFileSync.mock.calls[0]?.[1];
    expect(content).toContain('weird');
    expect(content).toContain('unknown');
    expect(content).toContain('id');
  });
});
