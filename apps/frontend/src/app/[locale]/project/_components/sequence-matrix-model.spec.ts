import { describe, expect, it } from 'vitest';
import {
  buildMatrixGroups,
  duplicateStep,
  fillRange,
  filterMatrixGroups,
  getCellValue,
  groupRowOffsets,
  insertEmptyStep,
  parseCellInput,
  pasteTsv,
  rangeToTsv,
  removeStep,
  setCellValue,
  UNPATCHED_GROUP_KEY,
  visibleMatrixRows,
  type MatrixChannelRow,
  type MatrixRow,
} from './sequence-matrix-model';
import type { SequenceFixtureChannel, SequenceStepDraft } from './sequence-steps';

const par: SequenceFixtureChannel = {
  publicId: 'par',
  startAddress: 10,
  name: 'PAR',
  channels: [
    { channelNumber: 2, name: 'Red' },
    { channelNumber: 1, name: 'Dimmer' },
  ],
};
const wash: SequenceFixtureChannel = {
  publicId: 'wash',
  startAddress: 1,
  name: 'Wash',
  channels: [{ channelNumber: 1, name: 'Intensity' }],
};

const step = (key: string, values: [number, number][] = []): SequenceStepDraft => ({
  key,
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: values.map(([channel, value]) => ({ key: `${key}-${channel}`, channel, value })),
});

const channelRow = (channel: number): MatrixChannelRow => ({ kind: 'channel', channel, label: String(channel) });

const stepAt = (steps: SequenceStepDraft[], index: number): SequenceStepDraft => {
  const found = steps[index];
  if (!found) {
    throw new Error(`missing step ${index}`);
  }
  return found;
};

describe('sequence matrix model', () => {
  it('groups patched channels by fixture and collects unpatched channels', () => {
    const groups = buildMatrixGroups(
      [par, wash],
      [
        step('a', [
          [11, 5],
          [300, 7],
        ]),
      ],
    );
    expect(groups.map(group => group.label)).toEqual(['Wash [1]', 'PAR [2]', '']);
    expect(groups[1]?.rows.map(row => row.label)).toEqual(['Dimmer · 10', 'Red · 11']);
    expect(groups[2]).toMatchObject({ key: UNPATCHED_GROUP_KEY, rows: [{ channel: 300 }] });
  });

  it('filters by fixture or channel name', () => {
    const groups = buildMatrixGroups([par, wash], []);
    expect(filterMatrixGroups(groups, 'wash').map(group => group.key)).toEqual(['wash']);
    expect(filterMatrixGroups(groups, 'red')).toEqual([{ ...groups[1], rows: [groups[1]?.rows[1]] }]);
    expect(filterMatrixGroups(groups, '  ')).toBe(groups);
  });

  it('lists timing rows first and skips collapsed groups', () => {
    const groups = buildMatrixGroups([par, wash], []);
    const rows = visibleMatrixRows(groups, new Set(['wash']));
    expect(rows.slice(0, 3).map(row => (row.kind === 'timing' ? row.field : ''))).toEqual([
      'fadeIn',
      'hold',
      'fadeOut',
    ]);
    expect(rows.slice(3).map(row => (row.kind === 'channel' ? row.channel : 0))).toEqual([10, 11]);
    expect(groupRowOffsets(groups, new Set(['wash']))).toEqual([3, 3]);
  });

  it('reads, sets, clamps and removes cell values', () => {
    const fadeIn: MatrixRow = { kind: 'timing', field: 'fadeIn' };
    let steps = [step('a', [[1, 10]])];
    expect(getCellValue(stepAt(steps, 0), channelRow(1))).toBe(10);
    expect(getCellValue(stepAt(steps, 0), channelRow(2))).toBeUndefined();
    steps = setCellValue(steps, 0, channelRow(2), 300);
    expect(getCellValue(stepAt(steps, 0), channelRow(2))).toBe(255);
    steps = setCellValue(steps, 0, channelRow(1), undefined);
    expect(steps[0]?.dmxValues.map(entry => entry.channel)).toEqual([2]);
    steps = setCellValue(steps, 0, fadeIn, -5);
    expect(steps[0]?.fadeIn).toBe(0);
    steps = setCellValue(steps, 0, fadeIn, 250.6);
    expect(steps[0]?.fadeIn).toBe(251);
  });

  it('parses cell input', () => {
    const hold: MatrixRow = { kind: 'timing', field: 'hold' };
    expect(parseCellInput(channelRow(1), '')).toBeUndefined();
    expect(parseCellInput(channelRow(1), 'abc')).toBeNull();
    expect(parseCellInput(channelRow(1), '999')).toBe(255);
    expect(parseCellInput(hold, ' 1500 ')).toBe(1500);
  });

  it('fills a range, copies it as TSV and pastes it back', () => {
    const rows = [channelRow(1), channelRow(2)];
    let steps = [step('a'), step('b')];
    steps = fillRange(steps, rows, { anchor: { row: 0, column: 0 }, focus: { row: 1, column: 1 } }, 128);
    expect(steps.map(item => item.dmxValues.map(entry => entry.value))).toEqual([
      [128, 128],
      [128, 128],
    ]);
    steps = setCellValue(steps, 1, channelRow(2), undefined);
    const tsv = rangeToTsv(steps, rows, { anchor: { row: 1, column: 1 }, focus: { row: 0, column: 0 } });
    expect(tsv).toBe('128\t128\n128\t');
    const pasted = pasteTsv([step('x'), step('y')], rows, { row: 0, column: 1 }, '7\t8\n9\n');
    expect(getCellValue(stepAt(pasted, 1), channelRow(1))).toBe(7);
    expect(getCellValue(stepAt(pasted, 1), channelRow(2))).toBe(9);
    expect(pasted[0]?.dmxValues).toEqual([]);
  });

  it('inserts, duplicates and removes steps', () => {
    const steps = [step('a', [[1, 10]]), step('b')];
    expect(insertEmptyStep(steps, 1).map(item => item.dmxValues.length)).toEqual([1, 0, 0]);
    const duplicated = duplicateStep(steps, 0);
    expect(duplicated).toHaveLength(3);
    expect(duplicated[1]?.dmxValues[0]?.value).toBe(10);
    expect(duplicated[1]?.key).not.toBe('a');
    expect(duplicated[1]?.dmxValues[0]?.key).not.toBe('a-1');
    expect(removeStep(steps, 0).map(item => item.key)).toEqual(['b']);
  });
});
