/// <reference types="vitest/globals" />
import { vi } from 'vitest';

const writeFileSync = vi.fn();
const mkdirSync = vi.fn();

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
    const content = writeFileSync.mock.calls[0]?.[1] as string;
    expect(content).toContain('```mermaid');
    expect(content).toContain('erDiagram');
  });

  it('honors the --out flag', async () => {
    process.argv = ['node', 'generate-erd.ts', '--out', 'custom/out.md'];
    vi.resetModules();
    await import('./generate-erd');
    expect(writeFileSync.mock.calls[0]?.[0]).toBe('custom/out.md');
  });
});
