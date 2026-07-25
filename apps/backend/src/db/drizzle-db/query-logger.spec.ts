import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { DrizzleLogWriter } from './query-logger';

describe('DrizzleLogWriter', () => {
  it('writes the message via the DRIZZLE logger debug', () => {
    const spy = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    const writer = new DrizzleLogWriter();
    writer.write('SELECT 1');
    expect(spy).toHaveBeenCalledWith('SELECT 1');
    spy.mockRestore();
  });
});
