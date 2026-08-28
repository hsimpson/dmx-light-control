import { CHANNEL_RANGE_DESCRIPTION_MAX_LENGTH, parseChannelRangeImport } from './parse-channel-range-import';
import { describe, expect, it } from 'vitest';

describe('parseChannelRangeImport', () => {
  it('parses valid lines', () => {
    const result = parseChannelRangeImport('0 - 255 off-full\n10 - 19 slow strobe');

    expect(result.errors).toEqual([]);
    expect(result.ranges).toEqual([
      { dmxStart: 0, dmxEnd: 255, description: 'off-full' },
      { dmxStart: 10, dmxEnd: 19, description: 'slow strobe' },
    ]);
  });

  it('skips empty lines and trims whitespace', () => {
    const result = parseChannelRangeImport('  1-2 dim  \n\n  3 - 4 bright  ');

    expect(result.errors).toEqual([]);
    expect(result.ranges).toEqual([
      { dmxStart: 1, dmxEnd: 2, description: 'dim' },
      { dmxStart: 3, dmxEnd: 4, description: 'bright' },
    ]);
  });

  it('reports bad format', () => {
    const result = parseChannelRangeImport('not a range');

    expect(result.ranges).toEqual([]);
    expect(result.errors).toEqual([{ line: 1, content: 'not a range', message: 'invalidFormat' }]);
  });

  it('reports out of range values', () => {
    const result = parseChannelRangeImport('256 - 255 invalid');

    expect(result.ranges).toEqual([]);
    expect(result.errors).toEqual([{ line: 1, content: '256 - 255 invalid', message: 'invalidFormat' }]);
  });

  it('reports start greater than end', () => {
    const result = parseChannelRangeImport('20 - 10 reversed');

    expect(result.ranges).toEqual([]);
    expect(result.errors).toEqual([{ line: 1, content: '20 - 10 reversed', message: 'invalidFormat' }]);
  });

  it('reports duplicate descriptions within the batch', () => {
    const result = parseChannelRangeImport('0 - 1 off\n2 - 3 off');

    expect(result.ranges).toEqual([{ dmxStart: 0, dmxEnd: 1, description: 'off' }]);
    expect(result.errors).toEqual([{ line: 2, content: '2 - 3 off', message: 'duplicateDescription' }]);
  });

  it('reports descriptions longer than the maximum length', () => {
    const longDescription = 'a'.repeat(CHANNEL_RANGE_DESCRIPTION_MAX_LENGTH + 1);
    const result = parseChannelRangeImport(`0 - 1 ${longDescription}`);

    expect(result.ranges).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe('invalidFormat');
  });
});
