import {
  absoluteDmxChannel,
  emptySequenceStep,
  newSequenceDmxValue,
  sortedSequenceFixtures,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

export const TIMING_FIELDS = ['fadeIn', 'hold', 'fadeOut'] as const;

export type TimingField = (typeof TIMING_FIELDS)[number];

export type MatrixChannelRow = { kind: 'channel'; channel: number; label: string };

export type MatrixRow = { kind: 'timing'; field: TimingField } | MatrixChannelRow;

export type MatrixGroup = { key: string; label: string; rows: MatrixChannelRow[] };

export type MatrixCell = { row: number; column: number };

export type MatrixRange = { anchor: MatrixCell; focus: MatrixCell };

export const UNPATCHED_GROUP_KEY = 'unpatched';

export const buildMatrixGroups = (fixtures: SequenceFixtureChannel[], steps: SequenceStepDraft[]): MatrixGroup[] => {
  const patched = new Set<number>();
  const groups: MatrixGroup[] = sortedSequenceFixtures(fixtures).map((fixture, index) => {
    const rows = [...fixture.channels]
      .sort((left, right) => left.channelNumber - right.channelNumber)
      .map(item => {
        const channel = absoluteDmxChannel(fixture.startAddress, item.channelNumber);
        patched.add(channel);
        return { kind: 'channel' as const, channel, label: `${item.name} · ${channel}` };
      });
    return { key: fixture.publicId, label: `${fixture.name} [${index + 1}]`, rows };
  });
  const unpatched = [...new Set(steps.flatMap(item => item.dmxValues.map(entry => entry.channel)))]
    .filter(channel => !patched.has(channel))
    .sort((left, right) => left - right);
  if (unpatched.length > 0) {
    groups.push({
      key: UNPATCHED_GROUP_KEY,
      label: '',
      rows: unpatched.map(channel => ({ kind: 'channel', channel, label: String(channel) })),
    });
  }
  return groups;
};

export const filterMatrixGroups = (groups: MatrixGroup[], query: string): MatrixGroup[] => {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return groups;
  }
  return groups.flatMap(group => {
    if (group.label.toLowerCase().includes(needle)) {
      return [group];
    }
    const rows = group.rows.filter(row => row.label.toLowerCase().includes(needle));
    return rows.length > 0 ? [{ ...group, rows }] : [];
  });
};

export const visibleMatrixRows = (groups: MatrixGroup[], collapsed: ReadonlySet<string>): MatrixRow[] => [
  ...TIMING_FIELDS.map(field => ({ kind: 'timing' as const, field })),
  ...groups.flatMap(group => (collapsed.has(group.key) ? [] : group.rows)),
];

export const groupRowOffsets = (groups: MatrixGroup[], collapsed: ReadonlySet<string>): number[] => {
  const offsets: number[] = [];
  let next = TIMING_FIELDS.length;
  for (const group of groups) {
    offsets.push(next);
    if (!collapsed.has(group.key)) {
      next += group.rows.length;
    }
  }
  return offsets;
};

export const getCellValue = (step: SequenceStepDraft, row: MatrixRow): number | undefined =>
  row.kind === 'timing' ? step[row.field] : step.dmxValues.find(entry => entry.channel === row.channel)?.value;

const clampCellValue = (row: MatrixRow, value: number): number => {
  const rounded = Math.round(value);
  return row.kind === 'timing' ? Math.max(0, rounded) : Math.min(255, Math.max(0, rounded));
};

export const parseCellInput = (row: MatrixRow, raw: string): number | undefined | null => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? clampCellValue(row, parsed) : null;
};

export const setCellValue = (
  steps: SequenceStepDraft[],
  stepIndex: number,
  row: MatrixRow,
  value: number | undefined,
): SequenceStepDraft[] =>
  steps.map((step, index) => {
    if (index !== stepIndex) {
      return step;
    }
    if (row.kind === 'timing') {
      return { ...step, [row.field]: value === undefined ? 0 : clampCellValue(row, value) };
    }
    const existing = step.dmxValues.find(entry => entry.channel === row.channel);
    if (value === undefined) {
      return existing ? { ...step, dmxValues: step.dmxValues.filter(entry => entry.channel !== row.channel) } : step;
    }
    const clamped = clampCellValue(row, value);
    if (existing) {
      return {
        ...step,
        dmxValues: step.dmxValues.map(entry => (entry.channel === row.channel ? { ...entry, value: clamped } : entry)),
      };
    }
    return { ...step, dmxValues: [...step.dmxValues, newSequenceDmxValue(row.channel, clamped)] };
  });

export const rangeBounds = ({ anchor, focus }: MatrixRange) => ({
  top: Math.min(anchor.row, focus.row),
  bottom: Math.max(anchor.row, focus.row),
  left: Math.min(anchor.column, focus.column),
  right: Math.max(anchor.column, focus.column),
});

export const isCellInRange = (range: MatrixRange, cell: MatrixCell): boolean => {
  const { top, bottom, left, right } = rangeBounds(range);
  return cell.row >= top && cell.row <= bottom && cell.column >= left && cell.column <= right;
};

export const fillRange = (
  steps: SequenceStepDraft[],
  rows: MatrixRow[],
  range: MatrixRange,
  value: number | undefined,
): SequenceStepDraft[] => {
  const { top, bottom, left, right } = rangeBounds(range);
  let next = steps;
  for (let rowIndex = top; rowIndex <= bottom; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) {
      continue;
    }
    for (let column = left; column <= Math.min(right, steps.length - 1); column += 1) {
      next = setCellValue(next, column, row, value);
    }
  }
  return next;
};

export const rangeToTsv = (steps: SequenceStepDraft[], rows: MatrixRow[], range: MatrixRange): string => {
  const { top, bottom, left, right } = rangeBounds(range);
  const lines: string[] = [];
  for (let rowIndex = top; rowIndex <= bottom; rowIndex += 1) {
    const row = rows[rowIndex];
    const cells: string[] = [];
    for (let column = left; column <= right; column += 1) {
      const step = steps[column];
      const value = row && step ? getCellValue(step, row) : undefined;
      cells.push(value === undefined ? '' : String(value));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
};

export const pasteTsv = (
  steps: SequenceStepDraft[],
  rows: MatrixRow[],
  at: MatrixCell,
  text: string,
): SequenceStepDraft[] => {
  const lines = text.replace(/\r?\n$/, '').split(/\r?\n/);
  let next = steps;
  lines.forEach((line, lineIndex) => {
    const row = rows[at.row + lineIndex];
    if (!row) {
      return;
    }
    line.split('\t').forEach((raw, cellIndex) => {
      const column = at.column + cellIndex;
      if (column >= steps.length) {
        return;
      }
      const value = parseCellInput(row, raw);
      if (value !== null) {
        next = setCellValue(next, column, row, value);
      }
    });
  });
  return next;
};

export const insertEmptyStep = (steps: SequenceStepDraft[], index: number): SequenceStepDraft[] => [
  ...steps.slice(0, index),
  emptySequenceStep(),
  ...steps.slice(index),
];

export const duplicateStep = (steps: SequenceStepDraft[], index: number): SequenceStepDraft[] => {
  const source = steps[index];
  if (!source) {
    return steps;
  }
  const copy: SequenceStepDraft = {
    ...source,
    key: crypto.randomUUID(),
    dmxValues: source.dmxValues.map(entry => newSequenceDmxValue(entry.channel, entry.value)),
  };
  return [...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)];
};

export const removeStep = (steps: SequenceStepDraft[], index: number): SequenceStepDraft[] =>
  steps.filter((_, candidate) => candidate !== index);
