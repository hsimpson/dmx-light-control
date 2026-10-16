# Sequence Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal Sequence function editor with a full-page step × channel matrix editor, adding live preview and capture from the live universe.

**Architecture:** A new page in the `(bare)` route group (no project tab bar) hosts `SequenceEditor`. `SequenceEditor` owns the draft, renders a header (name, direction, run order, Live, capture, Save, Back) and a `SequenceMatrix` grid. Pure helpers (`sequence-matrix-model.ts`, `sequence-live-preview.ts`, `sequence-capture.ts`) hold all the data logic and are unit-tested. Two hooks connect the editor to the existing DMX zustand store and WebSocket client. There are no backend changes.

**Tech Stack:** Next.js 16 App Router, React 19, Mantine v9, Apollo Client v4, zustand (`dmxStore`), `@dnd-kit/react`, react-intl, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-sequence-editor-design.md`

## Global Constraints

- Package manager `pnpm`. Run Nx as `nx <target> <project>`, without a `pnpm` prefix.
- All new frontend files live in `apps/frontend/src/app/[locale]/project/_components/` unless a route file is named explicitly.
- Client components start with `'use client';`. Prop types are named `*Properties`.
- Use Phosphor icons. Icon names end with `Icon` (e.g. `PlusIcon`).
- Every user-visible string uses `t({ id, defaultMessage })` from `@/lib/i18n/use-translation`. Never build a translated string from a variable id.
- **i18n sync procedure** (run in every task that adds or removes strings):
  1. Add the listed German entries to `apps/frontend/src/lang/de.json`.
  2. Run `nx run frontend:i18n-extract`. This rewrites `en.json` from the source and prunes unused keys.
  3. Re-order `de.json` to match `en.json` and fail on missing keys:
     ```bash
     node -e "const fs=require('fs');const en=JSON.parse(fs.readFileSync('apps/frontend/src/lang/en.json','utf8'));const p='apps/frontend/src/lang/de.json';const de=JSON.parse(fs.readFileSync(p,'utf8'));const missing=Object.keys(en).filter(k=>!(k in de));if(missing.length){console.error('missing de:',missing);process.exit(1)}fs.writeFileSync(p,JSON.stringify(Object.fromEntries(Object.keys(en).map(k=>[k,de[k]])),null,2)+'\n')"
     ```
  4. Run `nx run frontend:i18n-verify`. The expected result is a pass.
- ESLint rules to respect: `eqeqeq`, `@typescript-eslint/switch-exhaustiveness-check`, `@typescript-eslint/no-shadow`, `jsx-a11y` (no `autoFocus`), and `react-hooks` v7 (no `setState` directly in an effect body, no ref reads during render).
- Before each commit, run `pnpm exec prettier --write <changed files>`.
- Run frontend tests with `nx test frontend -- <path-filter>`. The filter is a Vitest file filter.

---

## File Map

| File                                                                                                 | Responsibility                                                                            |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `project-function-mapping.ts` (create)                                                               | `ProjectFunctionDraft` type, GraphQL ↔ draft mapping, fixture extraction                  |
| `sequence-matrix-model.ts` (create)                                                                  | Pure matrix model: groups, rows, cells, ranges, fill, TSV, step insert/duplicate/remove   |
| `sequence-matrix.module.css` (create)                                                                | Sticky grid styles                                                                        |
| `sequence-matrix.tsx` (create)                                                                       | Grid component: render, selection, editing, keyboard, clipboard, filter, collapse         |
| `sequence-matrix-step-header.tsx` (create)                                                           | Sortable column header with the step action menu                                          |
| `sequence-editor.tsx` (create)                                                                       | Presentational editor: header, draft state, dirty guard, Live, capture                    |
| `sequence-editor-page.tsx` (create)                                                                  | Container: query, mutations, routing                                                      |
| `sequence-live-preview.ts` (create)                                                                  | Pure restore-set and output helpers                                                       |
| `use-sequence-live-preview.ts` (create)                                                              | Live hook over `dmxStore` and the WebSocket client                                        |
| `sequence-capture.ts` (create)                                                                       | Pure append/merge of captured values                                                      |
| `use-sequence-capture.ts` (create)                                                                   | Capture-buffer hook over `dmxStore`                                                       |
| `[publicId]/(bare)/functions/new/page.tsx` (create)                                                  | Route: new function                                                                       |
| `[publicId]/(bare)/functions/[functionPublicId]/page.tsx` (create)                                   | Route: edit function                                                                      |
| `project-function-table.tsx` (modify)                                                                | Navigate to the editor page instead of opening the modal                                  |
| `project-function-modal.tsx`, `sequence-steps-editor.tsx`, `sequence-steps-editor.spec.tsx` (delete) | Replaced                                                                                  |
| `sequence-steps.ts` + `.spec.ts` (modify)                                                            | Remove `fixtureForAbsoluteChannel` and `firstUnusedAbsoluteChannel`, which become orphans |
| `apps/frontend/e2e/graphql-mock.ts`, `apps/frontend/e2e/project-functions.e2e.spec.ts`               | E2E coverage                                                                              |

---

### Task 1: Extract function mapping helpers

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/project-function-mapping.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/project-function-mapping.spec.ts`
- Modify: `apps/frontend/src/app/[locale]/project/_components/project-function-table.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/project-function-modal.tsx`

**Interfaces:**

- Produces:
  - `type ProjectFunctionDraft = { name: string; direction: 'forward' | 'backward'; runOrder: 'loop' | 'singleShot' | 'pingPong'; steps: SequenceStepDraft[] }`
  - `type ProjectFunctionRow` (one entry of `GetProjectQuery['project']['projectFunctions']`)
  - `newFunctionDraft(): ProjectFunctionDraft`
  - `functionToDraft(fn: ProjectFunctionRow): ProjectFunctionDraft`
  - `draftToSequenceInput(draft: ProjectFunctionDraft)` returns `{ direction: SequenceDirection; runOrder: SequenceRunOrder; steps: { fadeIn; hold; fadeOut; dmxValues: { channel; value }[] }[] }`
  - `projectSequenceFixtures(project: Pick<ProjectDetail, 'projectFixtures'> | null | undefined): SequenceFixtureChannel[]`

- [ ] **Step 1: Write the failing test**

`project-function-mapping.spec.ts`:

```ts
import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  type ProjectFunctionRow,
} from './project-function-mapping';

const row: ProjectFunctionRow = {
  publicId: 'fn-1',
  name: 'Chase',
  type: ProjectFunctionType.Sequence,
  sequence: {
    direction: SequenceDirection.Backward,
    runOrder: SequenceRunOrder.PingPong,
    steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
  },
};

describe('project function mapping', () => {
  it('maps a GraphQL function to a draft and back', () => {
    const draft = functionToDraft(row);
    expect(draft.name).toBe('Chase');
    expect(draft.direction).toBe('backward');
    expect(draft.runOrder).toBe('pingPong');
    expect(draft.steps[0]?.dmxValues[0]).toMatchObject({ channel: 3, value: 255 });
    expect(draftToSequenceInput(draft)).toEqual({
      direction: SequenceDirection.Backward,
      runOrder: SequenceRunOrder.PingPong,
      steps: [{ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 3, value: 255 }] }],
    });
  });

  it('defaults to forward loop with one empty step', () => {
    const draft = newFunctionDraft();
    expect(draft).toMatchObject({ name: '', direction: 'forward', runOrder: 'loop' });
    expect(draft.steps).toHaveLength(1);
    expect(draft.steps[0]?.dmxValues).toEqual([]);
  });
});
```

If `ProjectFunctionRow` requires `__typename` or `createdAt`/`updatedAt` (check `GetProjectQuery` in `src/shared/types/graphql/graphql.ts`), add exactly those fields to `row`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `nx test frontend -- project-function-mapping`
Expected: FAIL, because `./project-function-mapping` cannot be resolved.

- [ ] **Step 3: Implement**

`project-function-mapping.ts`:

```ts
import { type GetProjectQuery, SequenceDirection, SequenceRunOrder } from '@/shared/types/graphql/graphql';
import {
  emptySequenceStep,
  newSequenceDmxValue,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

type ProjectDetail = NonNullable<GetProjectQuery['project']>;

export type ProjectFunctionRow = ProjectDetail['projectFunctions'][number];

export type ProjectFunctionDraft = {
  name: string;
  direction: 'forward' | 'backward';
  runOrder: 'loop' | 'singleShot' | 'pingPong';
  steps: SequenceStepDraft[];
};

export const newFunctionDraft = (): ProjectFunctionDraft => ({
  name: '',
  direction: 'forward',
  runOrder: 'loop',
  steps: [emptySequenceStep()],
});

const directionToEnum = (direction: ProjectFunctionDraft['direction']) =>
  direction === 'backward' ? SequenceDirection.Backward : SequenceDirection.Forward;

const runOrderToEnum = (runOrder: ProjectFunctionDraft['runOrder']) => {
  switch (runOrder) {
    case 'singleShot':
      return SequenceRunOrder.SingleShot;
    case 'pingPong':
      return SequenceRunOrder.PingPong;
    case 'loop':
      return SequenceRunOrder.Loop;
  }
};

export const functionToDraft = (fn: ProjectFunctionRow): ProjectFunctionDraft => ({
  name: fn.name,
  direction: fn.sequence?.direction === SequenceDirection.Backward ? 'backward' : 'forward',
  runOrder:
    fn.sequence?.runOrder === SequenceRunOrder.SingleShot
      ? 'singleShot'
      : fn.sequence?.runOrder === SequenceRunOrder.PingPong
        ? 'pingPong'
        : 'loop',
  steps: (fn.sequence?.steps ?? []).map(step => ({
    key: crypto.randomUUID(),
    fadeIn: step.fadeIn,
    hold: step.hold,
    fadeOut: step.fadeOut,
    dmxValues: step.dmxValues.map(entry => newSequenceDmxValue(entry.channel, entry.value)),
  })),
});

export const draftToSequenceInput = (draft: ProjectFunctionDraft) => ({
  direction: directionToEnum(draft.direction),
  runOrder: runOrderToEnum(draft.runOrder),
  steps: draft.steps.map(step => ({
    fadeIn: step.fadeIn,
    hold: step.hold,
    fadeOut: step.fadeOut,
    dmxValues: step.dmxValues.map(({ channel, value }) => ({ channel, value })),
  })),
});

export const projectSequenceFixtures = (
  project: Pick<ProjectDetail, 'projectFixtures'> | null | undefined,
): SequenceFixtureChannel[] =>
  (project?.projectFixtures ?? []).map(fixture => ({
    publicId: fixture.publicId,
    startAddress: fixture.startAddress,
    name: fixture.fixture.name,
    channels: fixture.channelMode.fixtureChannelAssignments.map(assignment => ({
      channelNumber: assignment.channelNumber,
      name: assignment.fixtureChannelDefinition.name,
    })),
  }));
```

In `project-function-table.tsx`, make these changes:

- Delete the local `directionToEnum`, `runOrderToEnum`, `toDraft` and `sequenceInput` functions, the `ProjectFunctionRow` type alias, and the inline `fixtures` mapping.
- Import from `./project-function-mapping`: `draftToSequenceInput`, `functionToDraft`, `newFunctionDraft`, `projectSequenceFixtures`, `type ProjectFunctionDraft`, `type ProjectFunctionRow`.
- Replace the uses: `toDraft(fn)` becomes `functionToDraft(fn)`, `sequenceInput(draft)` becomes `draftToSequenceInput(draft)`, and the fixture mapping becomes `const fixtures = projectSequenceFixtures(data?.project);`.
- Remove the now-unused imports `SequenceDirection`, `SequenceRunOrder`, `newSequenceDmxValue` and `SequenceFixtureChannel`.
- Change the modal import to `import ProjectFunctionModal from './project-function-modal';`.

In `project-function-modal.tsx`, make these changes:

- Delete the `ProjectFunctionDraft` type and `newFunctionDraft`.
- Add `import type { ProjectFunctionDraft } from './project-function-mapping';`.
- Change the `sequence-steps` import to `import type { SequenceFixtureChannel } from './sequence-steps';`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `nx test frontend -- project-function && nx typecheck frontend`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/project-function-mapping.ts" "apps/frontend/src/app/[locale]/project/_components/project-function-mapping.spec.ts" "apps/frontend/src/app/[locale]/project/_components/project-function-table.tsx" "apps/frontend/src/app/[locale]/project/_components/project-function-modal.tsx"
git add apps/frontend/src/app/\[locale\]/project/_components/project-function-*
git commit -m "refactor(frontend): extract project function draft mapping"
```

---

### Task 2: Pure matrix model

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.spec.ts`

**Interfaces:**

- Consumes: `absoluteDmxChannel`, `emptySequenceStep`, `newSequenceDmxValue`, `sortedSequenceFixtures`, `SequenceFixtureChannel` and `SequenceStepDraft` from `./sequence-steps`.
- Produces (exact names used by Tasks 3–7):
  - `TIMING_FIELDS: readonly ['fadeIn', 'hold', 'fadeOut']`, `type TimingField`
  - `type MatrixChannelRow = { kind: 'channel'; channel: number; label: string }`
  - `type MatrixRow = { kind: 'timing'; field: TimingField } | MatrixChannelRow`
  - `type MatrixGroup = { key: string; label: string; rows: MatrixChannelRow[] }`
  - `UNPATCHED_GROUP_KEY = 'unpatched'`
  - `type MatrixCell = { row: number; column: number }`, `type MatrixRange = { anchor: MatrixCell; focus: MatrixCell }`
  - `buildMatrixGroups(fixtures, steps): MatrixGroup[]`
  - `filterMatrixGroups(groups, query): MatrixGroup[]`
  - `visibleMatrixRows(groups, collapsed: ReadonlySet<string>): MatrixRow[]`
  - `groupRowOffsets(groups, collapsed): number[]`
  - `getCellValue(step, row): number | undefined`
  - `parseCellInput(row, raw: string): number | undefined | null` (`null` means invalid input)
  - `setCellValue(steps, stepIndex, row, value: number | undefined): SequenceStepDraft[]`
  - `rangeBounds(range): { top; bottom; left; right }`, `isCellInRange(range, cell): boolean`
  - `fillRange(steps, rows, range, value: number | undefined): SequenceStepDraft[]`
  - `rangeToTsv(steps, rows, range): string`, `pasteTsv(steps, rows, at: MatrixCell, text: string): SequenceStepDraft[]`
  - `insertEmptyStep(steps, index)`, `duplicateStep(steps, index)`, `removeStep(steps, index)`: each returns `SequenceStepDraft[]`

- [ ] **Step 1: Write the failing tests**

`sequence-matrix-model.spec.ts`:

```ts
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
    expect(groups.map(group => group.label)).toEqual(['Wash [1] · DMX 1–1', 'PAR [2] · DMX 10–11', '']);
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
    expect(getCellValue(steps[0]!, channelRow(1))).toBe(10);
    expect(getCellValue(steps[0]!, channelRow(2))).toBeUndefined();
    steps = setCellValue(steps, 0, channelRow(2), 300);
    expect(getCellValue(steps[0]!, channelRow(2))).toBe(255);
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
    expect(getCellValue(pasted[1]!, channelRow(1))).toBe(7);
    expect(getCellValue(pasted[1]!, channelRow(2))).toBe(9);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `nx test frontend -- sequence-matrix.spec`
Expected: FAIL, because `./sequence-matrix-model` cannot be resolved.

- [ ] **Step 3: Implement**

`sequence-matrix-model.ts`:

```ts
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
    const first = rows[0]?.channel ?? fixture.startAddress;
    const last = rows.at(-1)?.channel ?? first;
    return { key: fixture.publicId, label: `${fixture.name} [${index + 1}] · DMX ${first}–${last}`, rows };
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `nx test frontend -- sequence-matrix.spec`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.spec.ts"
git add "apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix-model.spec.ts"
git commit -m "feat(frontend): add sequence matrix model helpers"
```

---

### Task 3: Matrix grid component

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix.module.css`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix.tsx`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix.spec.tsx`
- Modify: `apps/frontend/src/lang/de.json` (via the i18n sync procedure)

**Interfaces:**

- Consumes: everything from Task 2, plus `emptySequenceStep` and `SequenceFixtureChannel`.
- Produces: `default SequenceMatrix` with these props:
  `SequenceMatrixProperties = { fixtures: SequenceFixtureChannel[]; steps: SequenceStepDraft[]; range: MatrixRange; onChange: (steps: SequenceStepDraft[]) => void; onRangeChange: (range: MatrixRange) => void }`
- Cell accessibility contract (used by later tests and e2e): each cell is `role="gridcell"` with `aria-label="<row label>, Step <n>"`, where the row label is a timing label (e.g. `Fade in (ms)`) or a channel label (e.g. `Red · 11`). Column headers are `role="columnheader"` with text `Step <n>`.

- [ ] **Step 1: Write the failing tests**

`sequence-matrix.spec.tsx`:

```tsx
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SequenceMatrix from './sequence-matrix';
import type { MatrixRange } from './sequence-matrix-model';
import type { SequenceFixtureChannel, SequenceStepDraft } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  {
    publicId: 'par',
    startAddress: 10,
    name: 'PAR',
    channels: [
      { channelNumber: 1, name: 'Dimmer' },
      { channelNumber: 2, name: 'Red' },
    ],
  },
];

const initialSteps = (): SequenceStepDraft[] => [
  { key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ key: 'd1', channel: 10, value: 50 }] },
  { key: 's2', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] },
];

const onStepsChange = vi.fn<(steps: SequenceStepDraft[]) => void>();

const latestSteps = (): SequenceStepDraft[] => onStepsChange.mock.lastCall?.[0] ?? [];

const Harness = () => {
  const [steps, setSteps] = useState(initialSteps);
  const [range, setRange] = useState<MatrixRange>({ anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } });
  return (
    <SequenceMatrix
      fixtures={fixtures}
      steps={steps}
      range={range}
      onChange={next => {
        onStepsChange(next);
        setSteps(next);
      }}
      onRangeChange={setRange}
    />
  );
};

const cell = (name: string) => screen.getByRole('gridcell', { name });

describe('SequenceMatrix', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
    onStepsChange.mockClear();
  });

  it('renders steps as columns and channels grouped by fixture', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByRole('columnheader', { name: /Step 1/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Step 2/ })).toBeInTheDocument();
    expect(screen.getByText('PAR [1] · DMX 10–11')).toBeInTheDocument();
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('50');
    expect(cell('Red · 11, Step 1')).toHaveTextContent('');
  });

  it('edits a cell by typing and pressing Enter', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Red · 11, Step 2'));
    await user.keyboard('128{Enter}');
    expect(cell('Red · 11, Step 2')).toHaveTextContent('128');
    expect(latestSteps()[1]?.dmxValues).toMatchObject([{ channel: 11, value: 128 }]);
  });

  it('clears the selection with Delete and moves with arrow keys', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Fade in (ms), Step 1'));
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(cell('Dimmer · 10, Step 1')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Delete}');
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('');
  });

  it('fills a shift-selected range with Ctrl+Enter', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Dimmer · 10, Step 1'));
    await user.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}');
    await user.keyboard('9{Control>}{Enter}{/Control}');
    for (const name of ['Dimmer · 10, Step 1', 'Red · 11, Step 1', 'Dimmer · 10, Step 2', 'Red · 11, Step 2']) {
      expect(cell(name)).toHaveTextContent('9');
    }
  });

  it('pastes tab-separated values at the selection', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Dimmer · 10, Step 1'));
    await user.paste('1\t2\n3\t4');
    expect(cell('Red · 11, Step 2')).toHaveTextContent('4');
  });

  it('filters and collapses channel rows', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.type(screen.getByRole('textbox', { name: 'Filter channels' }), 'red');
    expect(screen.queryByRole('gridcell', { name: 'Dimmer · 10, Step 1' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Filter channels' }));
    await user.click(screen.getByRole('button', { name: 'Toggle PAR [1] · DMX 10–11' }));
    expect(screen.queryByRole('gridcell', { name: 'Red · 11, Step 1' })).not.toBeInTheDocument();
  });

  it('adds a step from the toolbar', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByRole('columnheader', { name: 'Step 3' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `nx test frontend -- sequence-matrix.spec.tsx`
Expected: FAIL, because `./sequence-matrix` has no default export.

- [ ] **Step 3: Implement the styles**

`sequence-matrix.module.css`:

```css
.scroller {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--mantine-color-default-border);
  border-radius: var(--mantine-radius-sm);
}

.grid {
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--mantine-font-size-sm);
  font-variant-numeric: tabular-nums;
  outline: none;
}

.grid th,
.grid td {
  height: 30px;
  padding: 0 8px;
  white-space: nowrap;
  border-right: 1px solid var(--mantine-color-default-border);
  border-bottom: 1px solid var(--mantine-color-default-border);
  background: var(--mantine-color-body);
}

.corner,
.stepHeader {
  position: sticky;
  top: 0;
  z-index: 3;
}

.corner {
  left: 0;
  z-index: 5;
}

.stepHeader {
  min-width: 72px;
  font-weight: 600;
  text-align: center;
}

.activeColumn {
  color: var(--mantine-color-blue-filled);
}

.rowLabel {
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 200px;
  font-weight: 400;
  text-align: left;
}

.timingLabel {
  z-index: 4;
  font-weight: 600;
}

.timingCell {
  position: sticky;
  z-index: 1;
}

.cell {
  min-width: 72px;
  text-align: right;
  cursor: cell;
  user-select: none;
}

.grid .cell[aria-selected='true'] {
  background: var(--mantine-color-blue-light);
}

.focused {
  outline: 2px solid var(--mantine-color-blue-filled);
  outline-offset: -2px;
}

.empty {
  color: var(--mantine-color-dimmed);
}

.grid .groupRow th {
  padding: 0;
  background: var(--mantine-color-default-hover);
}

.groupLabel {
  position: sticky;
  left: 0;
  width: max-content;
  padding: 0 8px;
}

.cellInput {
  width: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  text-align: right;
}
```

- [ ] **Step 4: Implement the component**

`sequence-matrix.tsx`:

```tsx
'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { CaretDownIcon, CaretRightIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Fragment, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  buildMatrixGroups,
  fillRange,
  filterMatrixGroups,
  getCellValue,
  groupRowOffsets,
  isCellInRange,
  parseCellInput,
  pasteTsv,
  rangeBounds,
  rangeToTsv,
  setCellValue,
  TIMING_FIELDS,
  UNPATCHED_GROUP_KEY,
  visibleMatrixRows,
  type MatrixCell,
  type MatrixRange,
  type MatrixRow,
  type TimingField,
} from './sequence-matrix-model';
import classes from './sequence-matrix.module.css';
import { emptySequenceStep, type SequenceFixtureChannel, type SequenceStepDraft } from './sequence-steps';

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 30;

export type SequenceMatrixProperties = {
  fixtures: SequenceFixtureChannel[];
  steps: SequenceStepDraft[];
  range: MatrixRange;
  onChange: (steps: SequenceStepDraft[]) => void;
  onRangeChange: (range: MatrixRange) => void;
};

const SequenceMatrix = ({ fixtures, steps, range, onChange, onRangeChange }: SequenceMatrixProperties) => {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editFinishedRef = useRef(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const isEditing = editing !== null;

  const unpatchedLabel = t({ id: 'ProjectFunction.matrix.unpatched', defaultMessage: 'Unpatched' });
  const filterLabel = t({ id: 'ProjectFunction.matrix.filter', defaultMessage: 'Filter channels' });
  const groups = useMemo(
    () =>
      filterMatrixGroups(
        buildMatrixGroups(fixtures, steps).map(group =>
          group.key === UNPATCHED_GROUP_KEY ? { ...group, label: unpatchedLabel } : group,
        ),
        query,
      ),
    [fixtures, steps, query, unpatchedLabel],
  );
  const rows = visibleMatrixRows(groups, collapsed);
  const offsets = groupRowOffsets(groups, collapsed);
  const clampCell = (cell: MatrixCell): MatrixCell => ({
    row: Math.min(Math.max(cell.row, 0), rows.length - 1),
    column: Math.min(Math.max(cell.column, 0), Math.max(steps.length - 1, 0)),
  });
  const anchor = clampCell(range.anchor);
  const focus = clampCell(range.focus);
  const current: MatrixRange = { anchor, focus };
  const focusRow = rows[focus.row];
  const focusStep = steps[focus.column];

  useEffect(() => {
    gridRef.current?.querySelector('[data-focused="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focus.row, focus.column]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const timingLabel = (field: TimingField) => {
    switch (field) {
      case 'fadeIn':
        return t({ id: 'ProjectFunction.fadeIn', defaultMessage: 'Fade in (ms)' });
      case 'hold':
        return t({ id: 'ProjectFunction.hold', defaultMessage: 'Hold (ms)' });
      case 'fadeOut':
        return t({ id: 'ProjectFunction.fadeOut', defaultMessage: 'Fade out (ms)' });
    }
  };
  const rowLabel = (row: MatrixRow) => (row.kind === 'timing' ? timingLabel(row.field) : row.label);
  const stepLabel = (column: number) => `${t({ id: 'ProjectFunction.step', defaultMessage: 'Step' })} ${column + 1}`;

  const select = (cell: MatrixCell, extend: boolean) => {
    const next = clampCell(cell);
    setEditing(null);
    onRangeChange({ anchor: extend ? anchor : next, focus: next });
  };

  const startEditing = (initial: string) => {
    editFinishedRef.current = false;
    setEditing(initial);
  };

  const finishEditing = (raw: string | null, fill: boolean) => {
    if (editFinishedRef.current) {
      return;
    }
    editFinishedRef.current = true;
    setEditing(null);
    gridRef.current?.focus();
    if (raw === null || !focusRow) {
      return;
    }
    const value = parseCellInput(focusRow, raw);
    if (value === null) {
      return;
    }
    onChange(fill ? fillRange(steps, rows, current, value) : setCellValue(steps, focus.column, focusRow, value));
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const raw = event.currentTarget.value;
    const modifier = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        finishEditing(raw, modifier);
        if (!modifier) {
          select({ row: focus.row + 1, column: focus.column }, false);
        }
        return;
      case 'Tab':
        event.preventDefault();
        finishEditing(raw, false);
        select({ row: focus.row, column: focus.column + (event.shiftKey ? -1 : 1) }, false);
        return;
      case 'Escape':
        event.preventDefault();
        finishEditing(null, false);
        return;
      default:
        return;
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing || !focusRow || !focusStep) {
      return;
    }
    const move = (rowDelta: number, columnDelta: number) => {
      select({ row: focus.row + rowDelta, column: focus.column + columnDelta }, event.shiftKey);
    };
    switch (event.key) {
      case 'ArrowUp':
        move(-1, 0);
        break;
      case 'ArrowDown':
        move(1, 0);
        break;
      case 'ArrowLeft':
        move(0, -1);
        break;
      case 'ArrowRight':
        move(0, 1);
        break;
      case 'Tab': {
        const column = focus.column + (event.shiftKey ? -1 : 1);
        if (column < 0 || column >= steps.length) {
          return;
        }
        select({ row: focus.row, column }, false);
        break;
      }
      case 'Enter':
      case 'F2':
        startEditing(String(getCellValue(focusStep, focusRow) ?? ''));
        break;
      case 'Delete':
      case 'Backspace':
        onChange(fillRange(steps, rows, current, undefined));
        break;
      default:
        if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
        startEditing(event.key);
        break;
    }
    event.preventDefault();
  };

  const onCopy = (event: ClipboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing) {
      return;
    }
    event.clipboardData.setData('text/plain', rangeToTsv(steps, rows, current));
    event.preventDefault();
  };

  const onPaste = (event: ClipboardEvent<HTMLTableElement>) => {
    if (event.target !== event.currentTarget || isEditing) {
      return;
    }
    const { top, left } = rangeBounds(current);
    onChange(pasteTsv(steps, rows, { row: top, column: left }, event.clipboardData.getData('text/plain')));
    event.preventDefault();
  };

  const toggleGroup = (key: string) => {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderCell = (row: MatrixRow, rowIndex: number, step: SequenceStepDraft, column: number, top?: number) => {
    const isFocused = rowIndex === focus.row && column === focus.column;
    const value = getCellValue(step, row);
    return (
      <td
        key={step.key}
        role="gridcell"
        aria-label={`${rowLabel(row)}, ${stepLabel(column)}`}
        aria-selected={isCellInRange(current, { row: rowIndex, column })}
        data-focused={isFocused}
        className={clsx(
          classes.cell,
          isFocused && classes.focused,
          value === undefined && classes.empty,
          top !== undefined && classes.timingCell,
        )}
        style={top === undefined ? undefined : { top }}
        onMouseDown={event => {
          if (isFocused && isEditing) {
            return;
          }
          event.preventDefault();
          gridRef.current?.focus();
          select({ row: rowIndex, column }, event.shiftKey);
        }}
        onDoubleClick={() => {
          startEditing(String(value ?? ''));
        }}
      >
        {isFocused && isEditing ? (
          <input
            ref={inputRef}
            className={classes.cellInput}
            inputMode="numeric"
            aria-label={t({ id: 'ProjectFunction.matrix.editCell', defaultMessage: 'Edit value' })}
            value={editing}
            onChange={event => {
              setEditing(event.currentTarget.value);
            }}
            onFocus={event => {
              const { length } = event.currentTarget.value;
              event.currentTarget.setSelectionRange(length, length);
            }}
            onKeyDown={onEditorKeyDown}
            onBlur={event => {
              finishEditing(event.currentTarget.value, false);
            }}
          />
        ) : (
          value
        )}
      </td>
    );
  };

  return (
    <Stack gap="xs" flex={1} mih={0}>
      <Group justify="space-between">
        <Group gap="xs">
          <TextInput
            size="xs"
            aria-label={filterLabel}
            placeholder={filterLabel}
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={event => {
              setQuery(event.currentTarget.value);
            }}
          />
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              setCollapsed(new Set(groups.map(group => group.key)));
            }}
          >
            {t({ id: 'ProjectFunction.matrix.collapseAll', defaultMessage: 'Collapse all' })}
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              setCollapsed(new Set());
            }}
          >
            {t({ id: 'ProjectFunction.matrix.expandAll', defaultMessage: 'Expand all' })}
          </Button>
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<PlusIcon />}
          onClick={() => {
            onChange([...steps, emptySequenceStep()]);
          }}
        >
          {t({ id: 'ProjectFunction.addStep', defaultMessage: 'Add step' })}
        </Button>
      </Group>
      {steps.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t({ id: 'ProjectFunction.matrix.noSteps', defaultMessage: 'No steps yet. Add a step to start.' })}
        </Text>
      ) : (
        <div className={classes.scroller}>
          <table
            ref={gridRef}
            role="grid"
            tabIndex={0}
            aria-label={t({ id: 'ProjectFunction.matrix.label', defaultMessage: 'Sequence steps' })}
            className={classes.grid}
            onKeyDown={onGridKeyDown}
            onCopy={onCopy}
            onPaste={onPaste}
          >
            <thead>
              <tr>
                <th scope="col" className={classes.corner} style={{ height: HEADER_HEIGHT }} />
                {steps.map((step, column) => (
                  <th
                    key={step.key}
                    scope="col"
                    className={clsx(classes.stepHeader, column === focus.column && classes.activeColumn)}
                    style={{ height: HEADER_HEIGHT }}
                  >
                    {stepLabel(column)}
                  </th>
                ))}
              </tr>
              {TIMING_FIELDS.map((field, index) => {
                const top = HEADER_HEIGHT + index * ROW_HEIGHT;
                const row: MatrixRow = { kind: 'timing', field };
                return (
                  <tr key={field}>
                    <th scope="row" className={clsx(classes.rowLabel, classes.timingLabel)} style={{ top }}>
                      {timingLabel(field)}
                    </th>
                    {steps.map((step, column) => renderCell(row, index, step, column, top))}
                  </tr>
                );
              })}
            </thead>
            <tbody>
              {groups.map((group, groupIndex) => {
                const isCollapsed = collapsed.has(group.key);
                const offset = offsets[groupIndex] ?? 0;
                return (
                  <Fragment key={group.key}>
                    <tr className={classes.groupRow}>
                      <th scope="colgroup" colSpan={steps.length + 1}>
                        <Group gap={4} wrap="nowrap" className={classes.groupLabel}>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-expanded={!isCollapsed}
                            aria-label={t(
                              { id: 'ProjectFunction.matrix.toggleGroup', defaultMessage: 'Toggle {name}' },
                              { name: group.label },
                            )}
                            onClick={() => {
                              toggleGroup(group.key);
                            }}
                          >
                            {isCollapsed ? <CaretRightIcon /> : <CaretDownIcon />}
                          </ActionIcon>
                          <Text size="sm" fw={600}>
                            {group.label}
                          </Text>
                        </Group>
                      </th>
                    </tr>
                    {isCollapsed
                      ? null
                      : group.rows.map((row, rowInGroup) => (
                          <tr key={`${group.key}-${row.channel}`}>
                            <th scope="row" className={classes.rowLabel}>
                              {row.label}
                            </th>
                            {steps.map((step, column) => renderCell(row, offset + rowInGroup, step, column))}
                          </tr>
                        ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
};

export default SequenceMatrix;
```

The tests click cells with `user.click`. `onMouseDown` focuses the grid table first, so the following `user.keyboard` calls target the table and its `onKeyDown` handler.

- [ ] **Step 5: Run the i18n sync procedure** with these German entries:

```json
"ProjectFunction.matrix.collapseAll": "Alle einklappen",
"ProjectFunction.matrix.editCell": "Wert bearbeiten",
"ProjectFunction.matrix.expandAll": "Alle ausklappen",
"ProjectFunction.matrix.filter": "Kanäle filtern",
"ProjectFunction.matrix.label": "Sequenzschritte",
"ProjectFunction.matrix.noSteps": "Noch keine Schritte. Füge einen Schritt hinzu, um zu beginnen.",
"ProjectFunction.matrix.toggleGroup": "{name} umschalten",
"ProjectFunction.matrix.unpatched": "Nicht gepatcht"
```

- [ ] **Step 6: Run the tests, lint and typecheck**

Run: `nx test frontend -- sequence-matrix && nx run-many --targets typecheck,lint --projects frontend`
Expected: PASS, with zero lint errors. If `jsx-a11y` reports `no-noninteractive-element-interactions` on the `td`, check that `role="gridcell"` is present. `gridcell` is an interactive role and satisfies the rule.

- [ ] **Step 7: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/sequence-matrix.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix.spec.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix.module.css" apps/frontend/src/lang/en.json apps/frontend/src/lang/de.json
git add "apps/frontend/src/app/[locale]/project/_components/sequence-matrix."* apps/frontend/src/lang
git commit -m "feat(frontend): add sequence step matrix grid"
```

---

### Task 4: Step column header (reorder and actions)

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix-step-header.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-matrix.spec.tsx`
- Modify: `apps/frontend/src/lang/de.json`

**Interfaces:**

- Consumes: `duplicateStep`, `insertEmptyStep` and `removeStep` (Task 2), and `moveSequenceStep` from `./sequence-steps`.
- Produces: `default SequenceMatrixStepHeader` with props `{ stepKey: string; index: number; label: string; active: boolean; height: number; onDuplicate: () => void; onInsertBefore: () => void; onInsertAfter: () => void; onRemove: () => void }`. The menu trigger's accessible name is `"<label> actions"`, e.g. `Step 1 actions`.

- [ ] **Step 1: Add failing tests** at the end of the `describe` block in `sequence-matrix.spec.tsx`:

```tsx
it('duplicates, inserts and removes steps from the column menu', async () => {
  const { user } = renderWithProviders(<Harness />);
  const chooseStepAction = async (action: string) => {
    await user.click(screen.getByRole('button', { name: 'Step 1 actions' }));
    await user.click(await screen.findByRole('menuitem', { name: action }));
    await waitFor(() => {
      expect(screen.queryByRole('menu', { hidden: true })).not.toBeInTheDocument();
    });
  };

  await chooseStepAction('Duplicate step');
  expect(cell('Dimmer · 10, Step 2')).toHaveTextContent('50');
  expect(latestSteps()).toHaveLength(3);

  await chooseStepAction('Insert step before');
  expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('');
  expect(latestSteps()).toHaveLength(4);

  await chooseStepAction('Remove step');
  expect(latestSteps()).toHaveLength(3);
  expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('50');
});
```

Add `waitFor` to the `@testing-library/react` import. Waiting for the menu to unmount matters: the previous dropdown keeps fading out for 150 ms and belongs to a column whose index has shifted. The header's `Menu` sets `hideDetached={false}`, because jsdom has zero-size layout and Mantine otherwise marks the dropdown `display: none`.

- [ ] **Step 2: Run the tests to verify the new test fails**

Run: `nx test frontend -- sequence-matrix.spec.tsx`
Expected: FAIL, because no button is named `Step 1 actions`.

- [ ] **Step 3: Implement the header**

`sequence-matrix-step-header.tsx`:

```tsx
'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, Group, Menu, Text } from '@mantine/core';
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import classes from './sequence-matrix.module.css';

type SequenceMatrixStepHeaderProperties = {
  stepKey: string;
  index: number;
  label: string;
  active: boolean;
  height: number;
  onDuplicate: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onRemove: () => void;
};

const SequenceMatrixStepHeader = ({
  stepKey,
  index,
  label,
  active,
  height,
  onDuplicate,
  onInsertBefore,
  onInsertAfter,
  onRemove,
}: SequenceMatrixStepHeaderProperties) => {
  const { t } = useTranslation();
  const { ref, handleRef } = useSortable({ id: stepKey, index });

  return (
    <th ref={ref} scope="col" className={clsx(classes.stepHeader, active && classes.activeColumn)} style={{ height }}>
      <Group gap={2} justify="center" wrap="nowrap">
        <ActionIcon
          ref={handleRef}
          size="sm"
          variant="subtle"
          aria-label={t({ id: 'ProjectFunction.dragStep', defaultMessage: 'Drag step' })}
        >
          <DotsSixVerticalIcon />
        </ActionIcon>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        <Menu position="bottom-end" withinPortal hideDetached={false}>
          <Menu.Target>
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label={t(
                { id: 'ProjectFunction.matrix.stepActions', defaultMessage: '{step} actions' },
                { step: label },
              )}
            >
              <DotsThreeIcon />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<CopySimpleIcon />} onClick={onDuplicate}>
              {t({ id: 'ProjectFunction.matrix.duplicateStep', defaultMessage: 'Duplicate step' })}
            </Menu.Item>
            <Menu.Item leftSection={<ArrowLineLeftIcon />} onClick={onInsertBefore}>
              {t({ id: 'ProjectFunction.matrix.insertBefore', defaultMessage: 'Insert step before' })}
            </Menu.Item>
            <Menu.Item leftSection={<ArrowLineRightIcon />} onClick={onInsertAfter}>
              {t({ id: 'ProjectFunction.matrix.insertAfter', defaultMessage: 'Insert step after' })}
            </Menu.Item>
            <Menu.Item color="red" leftSection={<TrashIcon />} onClick={onRemove}>
              {t({ id: 'ProjectFunction.removeStep', defaultMessage: 'Remove step' })}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </th>
  );
};

export default SequenceMatrixStepHeader;
```

- [ ] **Step 4: Wire the header into the matrix.** In `sequence-matrix.tsx`, make these changes:

  1. Add these imports:

     ```tsx
     import { DragDropProvider } from '@dnd-kit/react';
     import SequenceMatrixStepHeader from './sequence-matrix-step-header';
     ```

     Add `duplicateStep`, `insertEmptyStep` and `removeStep` to the `./sequence-matrix-model` import. Add `moveSequenceStep` to the `./sequence-steps` import.

  2. Add this module-level helper below the constants:

     ```tsx
     function isSortableSource(source: unknown): source is { initialIndex: number; index: number } {
       return (
         typeof source === 'object' &&
         source !== null &&
         'initialIndex' in source &&
         'index' in source &&
         typeof source.initialIndex === 'number' &&
         typeof source.index === 'number'
       );
     }
     ```

  3. Wrap the `<div className={classes.scroller}>…</div>` in:

     ```tsx
     <DragDropProvider
       onDragEnd={event => {
         if (event.operation.canceled) {
           return;
         }
         const source = event.operation.source;
         if (!isSortableSource(source) || source.initialIndex === source.index) {
           return;
         }
         onChange(moveSequenceStep(steps, source.initialIndex, source.index));
       }}
     >
     ```

  4. Replace the `steps.map(...)` inside the first `<thead>` row with:

     ```tsx
     {
       steps.map((step, column) => (
         <SequenceMatrixStepHeader
           key={step.key}
           stepKey={step.key}
           index={column}
           label={stepLabel(column)}
           active={column === focus.column}
           height={HEADER_HEIGHT}
           onDuplicate={() => {
             onChange(duplicateStep(steps, column));
           }}
           onInsertBefore={() => {
             onChange(insertEmptyStep(steps, column));
           }}
           onInsertAfter={() => {
             onChange(insertEmptyStep(steps, column + 1));
           }}
           onRemove={() => {
             onChange(removeStep(steps, column));
           }}
         />
       ));
     }
     ```

- [ ] **Step 5: Run the i18n sync procedure** with these German entries:

```json
"ProjectFunction.matrix.duplicateStep": "Schritt duplizieren",
"ProjectFunction.matrix.insertAfter": "Schritt danach einfügen",
"ProjectFunction.matrix.insertBefore": "Schritt davor einfügen",
"ProjectFunction.matrix.stepActions": "Aktionen für {step}"
```

- [ ] **Step 6: Run the tests, lint and typecheck**

Run: `nx test frontend -- sequence-matrix && nx run-many --targets typecheck,lint --projects frontend`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/sequence-matrix.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix-step-header.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-matrix.spec.tsx" apps/frontend/src/lang/en.json apps/frontend/src/lang/de.json
git add "apps/frontend/src/app/[locale]/project/_components/sequence-matrix"* apps/frontend/src/lang
git commit -m "feat(frontend): add step column menu and drag reorder to sequence matrix"
```

---

### Task 5: Editor page, routes, and modal removal

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-editor.tsx`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-editor.spec.tsx`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-editor-page.tsx`
- Create: `apps/frontend/src/app/[locale]/project/[publicId]/(bare)/functions/new/page.tsx`
- Create: `apps/frontend/src/app/[locale]/project/[publicId]/(bare)/functions/[functionPublicId]/page.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/project-function-table.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-steps.ts` and `sequence-steps.spec.ts`
- Delete: `project-function-modal.tsx`, `sequence-steps-editor.tsx`, `sequence-steps-editor.spec.tsx`
- Modify: `apps/frontend/e2e/graphql-mock.ts`
- Create: `apps/frontend/e2e/project-functions.e2e.spec.ts`
- Modify: `apps/frontend/src/lang/de.json`

**Interfaces:**

- Consumes: Task 1 mapping helpers, the Task 3/4 `SequenceMatrix`, and `MatrixRange`.
- Produces:
  - `default SequenceEditor` with `SequenceEditorProperties = { fixtures: SequenceFixtureChannel[]; initial: ProjectFunctionDraft; saving: boolean; onSave: (draft: ProjectFunctionDraft) => Promise<boolean>; onLeave: () => void }`. Tasks 6 and 7 extend its header.
  - `default SequenceEditorPage` with props `{ projectPublicId: string; functionPublicId?: string }`.

- [ ] **Step 1: Write the failing editor tests**

`sequence-editor.spec.tsx`:

```tsx
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceEditor from './sequence-editor';
import type { SequenceFixtureChannel } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  { publicId: 'par', startAddress: 1, name: 'PAR', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
];

const initial = (): ProjectFunctionDraft => ({
  name: 'Chase',
  direction: 'forward',
  runOrder: 'loop',
  steps: [{ key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] }],
});

describe('SequenceEditor', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('saves the edited draft', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={onSave} onLeave={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wave');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' }));
    await user.keyboard('200{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Wave',
        steps: [expect.objectContaining({ dmxValues: [expect.objectContaining({ channel: 1, value: 200 })] })],
      }),
    );
  });

  it('leaves immediately when there are no changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving with unsaved changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('treats the draft as clean after a successful save', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor
        fixtures={fixtures}
        initial={initial()}
        saving={false}
        onSave={vi.fn().mockResolvedValue(true)}
        onLeave={onLeave}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `nx test frontend -- sequence-editor.spec`
Expected: FAIL, because `./sequence-editor` cannot be resolved.

- [ ] **Step 3: Implement `sequence-editor.tsx`**

```tsx
'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Box, Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceMatrix from './sequence-matrix';
import type { MatrixRange } from './sequence-matrix-model';
import type { SequenceFixtureChannel } from './sequence-steps';

const initialRange: MatrixRange = { anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } };

type SequenceEditorProperties = {
  fixtures: SequenceFixtureChannel[];
  initial: ProjectFunctionDraft;
  saving: boolean;
  onSave: (draft: ProjectFunctionDraft) => Promise<boolean>;
  onLeave: () => void;
};

const SequenceEditor = ({ fixtures, initial, saving, onSave, onLeave }: SequenceEditorProperties) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [range, setRange] = useState(initialRange);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);

  const save = async () => {
    if (await onSave(draft)) {
      setBaseline(draft);
    }
  };

  return (
    <Stack gap="sm" flex={1} mih={0}>
      <Group gap="sm" align="flex-end">
        <ActionIcon
          size="lg"
          variant="subtle"
          aria-label={t({ id: 'ProjectFunction.back', defaultMessage: 'Back' })}
          onClick={() => {
            if (dirty) {
              setConfirmLeave(true);
            } else {
              onLeave();
            }
          }}
        >
          <ArrowLeftIcon />
        </ActionIcon>
        <TextInput
          label={t({ id: 'ProjectFunction.name', defaultMessage: 'Name' })}
          value={draft.name}
          onChange={event => {
            const name = event.currentTarget.value;
            setDraft(current => ({ ...current, name }));
          }}
        />
        <Select
          allowDeselect={false}
          label={t({ id: 'ProjectFunction.direction', defaultMessage: 'Direction' })}
          data={[
            { value: 'forward', label: t({ id: 'ProjectFunction.directionForward', defaultMessage: 'Forward' }) },
            { value: 'backward', label: t({ id: 'ProjectFunction.directionBackward', defaultMessage: 'Backward' }) },
          ]}
          value={draft.direction}
          onChange={value => {
            if (value === 'forward' || value === 'backward') {
              setDraft(current => ({ ...current, direction: value }));
            }
          }}
        />
        <Select
          allowDeselect={false}
          label={t({ id: 'ProjectFunction.runOrder', defaultMessage: 'Run order' })}
          data={[
            { value: 'loop', label: t({ id: 'ProjectFunction.runOrderLoop', defaultMessage: 'Loop' }) },
            {
              value: 'singleShot',
              label: t({ id: 'ProjectFunction.runOrderSingleShot', defaultMessage: 'Single shot' }),
            },
            { value: 'pingPong', label: t({ id: 'ProjectFunction.runOrderPingPong', defaultMessage: 'Ping pong' }) },
          ]}
          value={draft.runOrder}
          onChange={value => {
            if (value === 'loop' || value === 'singleShot' || value === 'pingPong') {
              setDraft(current => ({ ...current, runOrder: value }));
            }
          }}
        />
        <Box flex={1} />
        <Button
          loading={saving}
          onClick={() => {
            void save();
          }}
        >
          {t({ id: 'ProjectFunction.save', defaultMessage: 'Save' })}
        </Button>
      </Group>
      <SequenceMatrix
        fixtures={fixtures}
        steps={draft.steps}
        range={range}
        onChange={steps => {
          setDraft(current => ({ ...current, steps }));
        }}
        onRangeChange={setRange}
      />
      <Modal
        opened={confirmLeave}
        title={t({ id: 'ProjectFunction.unsavedTitle', defaultMessage: 'Unsaved changes' })}
        onClose={() => {
          setConfirmLeave(false);
        }}
      >
        <Stack>
          <Text>
            {t({
              id: 'ProjectFunction.unsavedMessage',
              defaultMessage: 'You have unsaved changes. Leave without saving?',
            })}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setConfirmLeave(false);
              }}
            >
              {t({ id: 'ProjectFunction.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button color="red" onClick={onLeave}>
              {t({ id: 'ProjectFunction.leave', defaultMessage: 'Leave' })}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default SequenceEditor;
```

- [ ] **Step 4: Run the editor tests**

Run: `nx test frontend -- sequence-editor.spec`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the container and routes**

`sequence-editor-page.tsx`:

```tsx
'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddProjectFunctionDocument,
  GetProjectDocument,
  ProjectFunctionType,
  UpdateProjectFunctionDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  projectSequenceFixtures,
  type ProjectFunctionDraft,
} from './project-function-mapping';
import SequenceEditor from './sequence-editor';

type SequenceEditorPageProperties = {
  projectPublicId: string;
  functionPublicId?: string;
};

const SequenceEditorPage = ({ projectPublicId, functionPublicId }: SequenceEditorPageProperties) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading } = useQuery(GetProjectDocument, { variables: { publicId: projectPublicId } });
  const [addProjectFunction, { loading: adding }] = useMutation(AddProjectFunctionDocument);
  const [updateProjectFunction, { loading: updating }] = useMutation(UpdateProjectFunctionDocument);
  const project = data?.project;
  const fixtures = useMemo(() => projectSequenceFixtures(project), [project]);

  if (loading && !data) {
    return <Loading />;
  }
  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }
  const existing = functionPublicId ? project.projectFunctions.find(fn => fn.publicId === functionPublicId) : undefined;
  if (functionPublicId && !existing) {
    return <Text>{t({ id: 'ProjectFunction.notFound', defaultMessage: 'Function not found' })}</Text>;
  }

  const refetchQueries = [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }];
  const save = async (draft: ProjectFunctionDraft): Promise<boolean> => {
    const sequence = draftToSequenceInput(draft);
    try {
      if (functionPublicId) {
        await updateProjectFunction({
          variables: { input: { publicId: functionPublicId, name: draft.name.trim(), sequence } },
          refetchQueries,
        });
      } else {
        const result = await addProjectFunction({
          variables: {
            input: { projectPublicId, name: draft.name.trim(), type: ProjectFunctionType.Sequence, sequence },
          },
          refetchQueries,
        });
        const createdId = result.data?.addProjectFunction.publicId;
        if (createdId) {
          router.replace(`/project/${projectPublicId}/functions/${createdId}`);
        }
      }
      return true;
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : t({ id: 'ProjectFunction.saveFailed', defaultMessage: 'Could not save the function.' }),
      });
      return false;
    }
  };

  return (
    <SequenceEditor
      key={functionPublicId ?? 'new'}
      fixtures={fixtures}
      initial={existing ? functionToDraft(existing) : newFunctionDraft()}
      saving={adding || updating}
      onSave={save}
      onLeave={() => {
        router.push(`/project/${projectPublicId}/functions`);
      }}
    />
  );
};

export default SequenceEditorPage;
```

`[publicId]/(bare)/functions/new/page.tsx`:

```tsx
'use client';

import SequenceEditorPage from '@/app/[locale]/project/_components/sequence-editor-page';
import { useParams } from 'next/navigation';

const NewProjectFunctionPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  return <SequenceEditorPage projectPublicId={publicId} />;
};

export default NewProjectFunctionPage;
```

`[publicId]/(bare)/functions/[functionPublicId]/page.tsx`:

```tsx
'use client';

import SequenceEditorPage from '@/app/[locale]/project/_components/sequence-editor-page';
import { useParams } from 'next/navigation';

const EditProjectFunctionPage = () => {
  const { publicId, functionPublicId } = useParams<{ publicId: string; functionPublicId: string }>();
  return <SequenceEditorPage projectPublicId={publicId} functionPublicId={functionPublicId} />;
};

export default EditProjectFunctionPage;
```

- [ ] **Step 6: Switch the table to navigation and delete the modal**

In `project-function-table.tsx`, make these changes:

- Remove the `editor` state, the `save` function, the `addProjectFunction` and `updateProjectFunction` mutations, the `fixtures` constant, and the `{editor ? <ProjectFunctionModal …/> : null}` block.
- Remove the imports that are now unused: `ProjectFunctionModal`, `AddProjectFunctionDocument`, `UpdateProjectFunctionDocument`, `ProjectFunctionType`, `notifications`, and the mapping helpers. Keep `type ProjectFunctionRow`.
- Add `import { useRouter } from 'next/navigation';` and `const router = useRouter();`.
- Change the Add button's `onClick` to `router.push(\`/project/${projectPublicId}/functions/new\`);`.
- Change the edit icon's `onClick` to `router.push(\`/project/${projectPublicId}/functions/${fn.publicId}\`);`.

Delete the replaced files:

```bash
git rm "apps/frontend/src/app/[locale]/project/_components/project-function-modal.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-steps-editor.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-steps-editor.spec.tsx"
```

In `sequence-steps.ts`, delete `fixtureForAbsoluteChannel` and `firstUnusedAbsoluteChannel`, which are now unused. First confirm they have no other users with `rg -n "fixtureForAbsoluteChannel|firstUnusedAbsoluteChannel" apps/frontend/src`. In `sequence-steps.spec.ts`, remove both from the import and delete the two `expect` lines that use them. Keep the `absoluteDmxChannel` assertion.

- [ ] **Step 7: Add e2e mock support** in `apps/frontend/e2e/graphql-mock.ts`:

  1. Add these types below `MockedProjectFixture`:

     ```ts
     type MockedSequenceInput = {
       direction: string;
       runOrder: string;
       steps: { fadeIn: number; hold: number; fadeOut: number; dmxValues: { channel: number; value: number }[] }[];
     };

     type MockedProjectFunction = {
       __typename: 'ProjectFunctionDto';
       publicId: string;
       name: string;
       type: 'Sequence';
       sequence: {
         __typename: 'SequencePropertiesDto';
         direction: string;
         runOrder: string;
         steps: {
           __typename: 'SequenceStepDto';
           fadeIn: number;
           hold: number;
           fadeOut: number;
           dmxValues: { __typename: 'SequenceStepDmxValueDto'; channel: number; value: number }[];
         }[];
       };
     };

     const toMockedSequence = (sequence: MockedSequenceInput): MockedProjectFunction['sequence'] => ({
       __typename: 'SequencePropertiesDto',
       direction: sequence.direction,
       runOrder: sequence.runOrder,
       steps: sequence.steps.map(step => ({
         __typename: 'SequenceStepDto',
         fadeIn: step.fadeIn,
         hold: step.hold,
         fadeOut: step.fadeOut,
         dmxValues: step.dmxValues.map(entry => ({ __typename: 'SequenceStepDmxValueDto', ...entry })),
       })),
     });
     ```

  2. In `mockGraphql`, add `const projectFunctions: Record<string, MockedProjectFunction[]> = { [mockedProject.publicId]: [] };`. Extend the `variables.input` type with `sequence?: MockedSequenceInput;`.

  3. In the `GetProject` branch, add `projectFunctions: projectFunctions[publicId] ?? [],` next to `projectFixtures`.

  4. Directly after the `GetProject` branch, before `CreateProject` and therefore before the `updateProject` substring check, insert:

     ```ts
     } else if (postData.operationName === 'AddProjectFunction') {
       const input = postData.variables?.input;
       const projectPublicId = input?.projectPublicId ?? mockedProject.publicId;
       const list = (projectFunctions[projectPublicId] ??= []);
       const created: MockedProjectFunction = {
         __typename: 'ProjectFunctionDto',
         publicId: `fn-${list.length + 1}`,
         name: input?.name ?? '',
         type: 'Sequence',
         sequence: toMockedSequence(input?.sequence ?? { direction: 'Forward', runOrder: 'Loop', steps: [] }),
       };
       list.push(created);
       body = { data: { addProjectFunction: created } };
     } else if (postData.operationName === 'UpdateProjectFunction') {
       const input = postData.variables?.input;
       const existing = Object.values(projectFunctions)
         .flat()
         .find(fn => fn.publicId === input?.publicId);
       if (existing && input?.name !== undefined) {
         existing.name = input.name;
       }
       if (existing && input?.sequence) {
         existing.sequence = toMockedSequence(input.sequence);
       }
       body = { data: { updateProjectFunction: existing ?? null } };
     ```

     Check the enum string values Apollo sends (`SequenceDirection.Forward` in `src/shared/types/graphql/graphql.ts`). If they differ from `'Forward'`/`'Loop'`, use the generated values in the fallback.

- [ ] **Step 8: Write the e2e test** `apps/frontend/e2e/project-functions.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { mockGraphql, mockedProject } from './graphql-mock';

test.describe('project functions', () => {
  test.beforeEach(async ({ page }) => {
    await mockGraphql(page);
  });

  test('creates a sequence in the full-page editor', async ({ page }) => {
    await page.goto(`/de/project/${mockedProject.publicId}/functions`);
    await page.getByRole('button', { name: 'Funktion hinzufügen' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions/new$`));

    await page.getByRole('textbox', { name: 'Name' }).fill('Chase');
    await page.getByRole('gridcell', { name: 'Einblenden (ms), Schritt 1' }).click();
    await page.keyboard.type('500', { delay: 20 });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('gridcell', { name: 'Einblenden (ms), Schritt 1' })).toHaveText('500');

    await page.getByRole('button', { name: 'Schritt hinzufügen' }).click();
    await expect(page.getByRole('columnheader', { name: /Schritt 2/ })).toBeVisible();

    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions/fn-1$`));

    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(new RegExp(`/de/project/${mockedProject.publicId}/functions$`));
    await expect(page.getByRole('cell', { name: 'Chase' })).toBeVisible();
  });
});
```

- [ ] **Step 9: Run the i18n sync procedure** with these German entries:

```json
"ProjectFunction.back": "Zurück",
"ProjectFunction.leave": "Verlassen",
"ProjectFunction.notFound": "Funktion nicht gefunden",
"ProjectFunction.unsavedMessage": "Es gibt ungespeicherte Änderungen. Ohne Speichern verlassen?",
"ProjectFunction.unsavedTitle": "Ungespeicherte Änderungen"
```

The extract step prunes the keys the deleted files used (`addDmxValue`, `addTitle`, `editTitle`, `removeDmxValue`, `channel`, `value`, `typeSequence`, and any other key that is no longer referenced). The sync script then drops them from `de.json`. Confirm with `git diff apps/frontend/src/lang`.

- [ ] **Step 10: Run the full verification**

Run: `nx run-many --targets typecheck,lint --projects frontend && nx test frontend && nx e2e frontend`
Expected: all PASS. The new e2e test passes, and the existing `project-detail` e2e tests still pass.

The workspace-root `.env` sets `NODE_ENV=development`, and `next build` then fails while prerendering `/_global-error`. Run the e2e target with `NODE_ENV=production nx e2e frontend`. If a dev server already holds port 3001, run `pnpm exec playwright test` in `apps/frontend` instead; it reuses that server.

- [ ] **Step 11: Commit**

```bash
pnpm exec prettier --write $(git diff --name-only; git diff --cached --name-only; git ls-files --others --exclude-standard)
git add -A apps/frontend
git commit -m "feat(frontend): replace function modal with full-page sequence editor"
```

---

### Task 6: Live preview

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-live-preview.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-live-preview.spec.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/use-sequence-live-preview.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/use-sequence-live-preview.spec.ts`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-editor.tsx`
- Modify: `apps/frontend/src/lang/de.json`

**Interfaces:**

- Consumes: `dmxStore`, `useDmxStore` and `DmxChannelUpdate` from `@/lib/dmx/dmx-store`; `getDmxWebsocketClient()` from `@/lib/dmx/dmx-socket-connector` (its `setChannels(values: DmxChannelUpdate[])` applies values to the local store immediately and sends `set`).
- Produces:
  - `stepChannels(steps): number[]`
  - `snapshotChannels(universe: readonly number[], channels: readonly number[], restore: ReadonlyMap<number, number>): Map<number, number>`
  - `liveOutput(step, restore): DmxChannelUpdate[]`
  - `restoreOutput(restore): DmxChannelUpdate[]`
  - `useSequenceLivePreview(steps, selectedStep: number | undefined, onDisconnected: () => void)`, which returns `{ live: boolean; canGoLive: boolean; setLive: (live: boolean) => void; sentValues: RefObject<Map<number, number>> }`. Task 7 uses `sentValues`.

- [ ] **Step 1: Write the failing pure tests**

`sequence-live-preview.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { liveOutput, restoreOutput, snapshotChannels, stepChannels } from './sequence-live-preview';
import type { SequenceStepDraft } from './sequence-steps';

const step = (values: [number, number][]): SequenceStepDraft => ({
  key: crypto.randomUUID(),
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: values.map(([channel, value]) => ({ key: `${channel}`, channel, value })),
});

describe('sequence live preview helpers', () => {
  it('collects the channels used by any step', () => {
    expect(
      stepChannels([
        step([
          [3, 1],
          [1, 1],
        ]),
        step([
          [3, 2],
          [2, 1],
        ]),
      ]),
    ).toEqual([1, 2, 3]);
  });

  it('snapshots only channels missing from the restore set', () => {
    const universe = [10, 20, 30];
    const restore = snapshotChannels(universe, [1, 3], new Map([[1, 99]]));
    expect([...restore]).toEqual([
      [1, 99],
      [3, 30],
    ]);
  });

  it('outputs step values and restore values for channels the step omits', () => {
    const restore = new Map([
      [1, 10],
      [2, 20],
    ]);
    expect(liveOutput(step([[2, 255]]), restore)).toEqual([
      { channel: 1, value: 10 },
      { channel: 2, value: 255 },
    ]);
    expect(restoreOutput(restore)).toEqual([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `nx test frontend -- sequence-live-preview.spec`
Expected: FAIL, because the module cannot be resolved.

- [ ] **Step 3: Implement `sequence-live-preview.ts`**

```ts
import type { DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import type { SequenceStepDraft } from './sequence-steps';

export const stepChannels = (steps: SequenceStepDraft[]): number[] =>
  [...new Set(steps.flatMap(step => step.dmxValues.map(entry => entry.channel)))].sort((left, right) => left - right);

export const snapshotChannels = (
  universe: readonly number[],
  channels: readonly number[],
  restore: ReadonlyMap<number, number>,
): Map<number, number> => {
  const next = new Map(restore);
  for (const channel of channels) {
    if (!next.has(channel)) {
      next.set(channel, universe[channel - 1] ?? 0);
    }
  }
  return new Map([...next].sort(([left], [right]) => left - right));
};

export const liveOutput = (step: SequenceStepDraft, restore: ReadonlyMap<number, number>): DmxChannelUpdate[] =>
  [...restore].map(([channel, value]) => ({
    channel,
    value: step.dmxValues.find(entry => entry.channel === channel)?.value ?? value,
  }));

export const restoreOutput = (restore: ReadonlyMap<number, number>): DmxChannelUpdate[] =>
  [...restore].map(([channel, value]) => ({ channel, value }));
```

- [ ] **Step 4: Write the failing hook tests**

`use-sequence-live-preview.spec.ts`:

```ts
import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SequenceStepDraft } from './sequence-steps';
import { useSequenceLivePreview } from './use-sequence-live-preview';

const setChannels = vi.hoisted(() => vi.fn());

vi.mock('@/lib/dmx/dmx-socket-connector', () => ({
  getDmxWebsocketClient: () => ({ setChannels }),
}));

const step = (channel: number, value: number): SequenceStepDraft => ({
  key: `s${channel}`,
  fadeIn: 0,
  hold: 0,
  fadeOut: 0,
  dmxValues: [{ key: `d${channel}`, channel, value }],
});

const steps = [step(1, 255), step(2, 128)];

describe('useSequenceLivePreview', () => {
  beforeEach(() => {
    setChannels.mockClear();
    resetDmxStore();
    dmxStore.getState().applySnapshot([10, 20]);
    dmxStore.getState().setStatus('open');
  });

  it('sends the selected step and restores when switched off', () => {
    const { result, rerender } = renderHook(({ selected }) => useSequenceLivePreview(steps, selected, vi.fn()), {
      initialProps: { selected: 0 },
    });
    act(() => {
      result.current.setLive(true);
    });
    expect(result.current.live).toBe(true);
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 255 },
      { channel: 2, value: 20 },
    ]);
    rerender({ selected: 1 });
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 128 },
    ]);
    act(() => {
      result.current.setLive(false);
    });
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
    expect(result.current.sentValues.current.get(2)).toBe(20);
  });

  it('restores on unmount', () => {
    const { result, unmount } = renderHook(() => useSequenceLivePreview(steps, 0, vi.fn()));
    act(() => {
      result.current.setLive(true);
    });
    unmount();
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });

  it('switches off and reports when the socket disconnects', () => {
    const onDisconnected = vi.fn();
    const { result } = renderHook(() => useSequenceLivePreview(steps, 0, onDisconnected));
    act(() => {
      result.current.setLive(true);
    });
    act(() => {
      dmxStore.getState().setStatus('connecting');
    });
    expect(onDisconnected).toHaveBeenCalledTimes(1);
    expect(result.current.live).toBe(false);
    expect(result.current.canGoLive).toBe(false);
    expect(setChannels).toHaveBeenLastCalledWith([
      { channel: 1, value: 10 },
      { channel: 2, value: 20 },
    ]);
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `nx test frontend -- use-sequence-live-preview`
Expected: FAIL, because the module cannot be resolved.

- [ ] **Step 6: Implement `use-sequence-live-preview.ts`**

```ts
'use client';

import { getDmxWebsocketClient } from '@/lib/dmx/dmx-socket-connector';
import { dmxStore, useDmxStore, type DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';
import { liveOutput, restoreOutput, snapshotChannels, stepChannels } from './sequence-live-preview';
import type { SequenceStepDraft } from './sequence-steps';

export type SequenceLivePreview = {
  live: boolean;
  canGoLive: boolean;
  setLive: (live: boolean) => void;
  sentValues: RefObject<Map<number, number>>;
};

const sendTracked = (sent: Map<number, number>, updates: DmxChannelUpdate[]) => {
  if (updates.length === 0) {
    return;
  }
  for (const update of updates) {
    sent.set(update.channel, update.value);
  }
  getDmxWebsocketClient()?.setChannels(updates);
};

export const useSequenceLivePreview = (
  steps: SequenceStepDraft[],
  selectedStep: number | undefined,
  onDisconnected: () => void,
): SequenceLivePreview => {
  const [enabled, setEnabled] = useState(false);
  const open = useDmxStore(state => state.status === 'open');
  const restoreRef = useRef(new Map<number, number>());
  const sentRef = useRef(new Map<number, number>());
  const notifyDisconnected = useEffectEvent(onDisconnected);
  const step = selectedStep === undefined ? undefined : steps[selectedStep];
  const live = enabled && open && step !== undefined;

  useEffect(() => {
    if (!live || !step) {
      return;
    }
    restoreRef.current = snapshotChannels(dmxStore.getState().channels, stepChannels(steps), restoreRef.current);
    sendTracked(sentRef.current, liveOutput(step, restoreRef.current));
  }, [live, step, steps]);

  useEffect(() => {
    if (live || restoreRef.current.size === 0) {
      return;
    }
    sendTracked(sentRef.current, restoreOutput(restoreRef.current));
    restoreRef.current = new Map();
  }, [live]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return dmxStore.subscribe((state, previous) => {
      if (previous.status === 'open' && state.status !== 'open') {
        setEnabled(false);
        notifyDisconnected();
      }
    });
  }, [enabled]);

  useEffect(() => {
    const restore = restoreRef;
    const sent = sentRef;
    return () => {
      if (restore.current.size === 0) {
        return;
      }
      sendTracked(sent.current, restoreOutput(restore.current));
      restore.current = new Map();
    };
  }, []);

  return { live, canGoLive: open && step !== undefined, setLive: setEnabled, sentValues: sentRef };
};
```

When the socket is not open, `setChannels` queues the restore values. The client flushes them after the next snapshot.

- [ ] **Step 7: Run the hook tests**

Run: `nx test frontend -- sequence-live-preview`
Expected: PASS (6 tests).

- [ ] **Step 8: Integrate Live into `sequence-editor.tsx`**

Add these imports: `Badge` and `Switch` from `@mantine/core`, `notifications` from `@mantine/notifications`, and `useSequenceLivePreview` from `./use-sequence-live-preview`.

After the `dirty` constant, add:

```tsx
const selectedStep =
  draft.steps.length > 0 ? Math.min(Math.max(range.focus.column, 0), draft.steps.length - 1) : undefined;
const livePreview = useSequenceLivePreview(draft.steps, selectedStep, () => {
  notifications.show({
    color: 'orange',
    message: t({
      id: 'ProjectFunction.liveDisconnected',
      defaultMessage: 'Live preview stopped because the DMX connection was lost.',
    }),
  });
});
```

Insert this block directly before `<Box flex={1} />`:

```tsx
<Group gap="xs" pb={6}>
  <Switch
    label={t({ id: 'ProjectFunction.live', defaultMessage: 'Live' })}
    checked={livePreview.live}
    disabled={!livePreview.canGoLive && !livePreview.live}
    onChange={event => {
      livePreview.setLive(event.currentTarget.checked);
    }}
  />
  {livePreview.live ? (
    <Badge color="red" variant="filled">
      {t({ id: 'ProjectFunction.liveBadge', defaultMessage: 'LIVE' })}
    </Badge>
  ) : null}
</Group>
```

Add a test to `sequence-editor.spec.tsx`. It needs `import { resetDmxStore } from '@/lib/dmx/dmx-store';`, and `beforeEach` must call `resetDmxStore()`:

```tsx
it('disables Live while the DMX socket is not connected', () => {
  renderWithProviders(
    <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={vi.fn()} />,
  );
  expect(screen.getByRole('switch', { name: 'Live' })).toBeDisabled();
});
```

- [ ] **Step 9: Run the i18n sync procedure** with these German entries:

```json
"ProjectFunction.live": "Live",
"ProjectFunction.liveBadge": "LIVE",
"ProjectFunction.liveDisconnected": "Live-Vorschau beendet, weil die DMX-Verbindung getrennt wurde."
```

- [ ] **Step 10: Verify**

Run: `nx test frontend -- sequence && nx run-many --targets typecheck,lint --projects frontend`
Expected: PASS. If `react-hooks` warns about `restore.current` in the unmount cleanup, the local `restore`/`sent` aliases above are the intended pattern. These refs are not DOM refs, and their latest value is exactly what the cleanup needs.

- [ ] **Step 11: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/sequence-live-preview.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-live-preview.spec.ts" "apps/frontend/src/app/[locale]/project/_components/use-sequence-live-preview.ts" "apps/frontend/src/app/[locale]/project/_components/use-sequence-live-preview.spec.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-editor.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-editor.spec.tsx" apps/frontend/src/lang/en.json apps/frontend/src/lang/de.json
git add apps/frontend
git commit -m "feat(frontend): add live step preview to sequence editor"
```

---

### Task 7: Capture from live

**Files:**

- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-capture.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/sequence-capture.spec.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/use-sequence-capture.ts`
- Create: `apps/frontend/src/app/[locale]/project/_components/use-sequence-capture.spec.ts`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-editor.tsx`
- Modify: `apps/frontend/src/app/[locale]/project/_components/sequence-editor.spec.tsx`
- Modify: `apps/frontend/src/lang/de.json`

**Interfaces:**

- Consumes: `setCellValue` (Task 2), `emptySequenceStep`, `newSequenceDmxValue`, `absoluteDmxChannel`, `sentValues` from `useSequenceLivePreview` (Task 6), `dmxStore`, `useDmxStore` and `DmxChannelUpdate`.
- Produces:
  - `appendCapturedStep(steps, captured: DmxChannelUpdate[], timingSource: SequenceStepDraft | undefined): SequenceStepDraft[]`
  - `mergeCapturedIntoStep(steps, stepIndex: number, captured: DmxChannelUpdate[]): SequenceStepDraft[]`
  - `useSequenceCapture(patchedChannels: ReadonlySet<number>, sentValues: RefObject<Map<number, number>>)`, which returns `{ touchedCount: number; capturedValues: () => DmxChannelUpdate[]; clear: () => void }`

- [ ] **Step 1: Write the failing tests**

`sequence-capture.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { appendCapturedStep, mergeCapturedIntoStep } from './sequence-capture';
import type { SequenceStepDraft } from './sequence-steps';

const base: SequenceStepDraft = {
  key: 'a',
  fadeIn: 100,
  hold: 200,
  fadeOut: 300,
  dmxValues: [{ key: 'a1', channel: 1, value: 10 }],
};

describe('sequence capture helpers', () => {
  it('appends a step with captured values and copied timing', () => {
    const next = appendCapturedStep([base], [{ channel: 2, value: 50 }], base);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ fadeIn: 100, hold: 200, fadeOut: 300, dmxValues: [{ channel: 2, value: 50 }] });
    expect(appendCapturedStep([], [], undefined)[0]).toMatchObject({ fadeIn: 0, hold: 0, fadeOut: 0 });
  });

  it('merges captured values into an existing step', () => {
    const next = mergeCapturedIntoStep([base], 0, [
      { channel: 1, value: 99 },
      { channel: 3, value: 7 },
    ]);
    expect(next[0]?.dmxValues.map(entry => [entry.channel, entry.value])).toEqual([
      [1, 99],
      [3, 7],
    ]);
  });
});
```

`use-sequence-capture.spec.ts`:

```ts
import { dmxStore, resetDmxStore } from '@/lib/dmx/dmx-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSequenceCapture } from './use-sequence-capture';

const patched = new Set([1, 2]);

describe('useSequenceCapture', () => {
  beforeEach(() => {
    resetDmxStore();
  });

  it('records patched channels changed by others and ignores own sends', () => {
    const sent = { current: new Map([[2, 50]]) };
    const { result } = renderHook(() => useSequenceCapture(patched, sent));
    act(() => {
      dmxStore.getState().applyDelta([
        { channel: 1, value: 100 },
        { channel: 2, value: 50 },
        { channel: 3, value: 9 },
      ]);
    });
    expect(result.current.touchedCount).toBe(1);
    expect(result.current.capturedValues()).toEqual([{ channel: 1, value: 100 }]);
    act(() => {
      result.current.clear();
    });
    expect(result.current.touchedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `nx test frontend -- sequence-capture`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Implement**

`sequence-capture.ts`:

```ts
import type { DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { setCellValue } from './sequence-matrix-model';
import { emptySequenceStep, newSequenceDmxValue, type SequenceStepDraft } from './sequence-steps';

export const appendCapturedStep = (
  steps: SequenceStepDraft[],
  captured: DmxChannelUpdate[],
  timingSource: SequenceStepDraft | undefined,
): SequenceStepDraft[] => [
  ...steps,
  {
    ...emptySequenceStep(),
    fadeIn: timingSource?.fadeIn ?? 0,
    hold: timingSource?.hold ?? 0,
    fadeOut: timingSource?.fadeOut ?? 0,
    dmxValues: captured.map(({ channel, value }) => newSequenceDmxValue(channel, value)),
  },
];

export const mergeCapturedIntoStep = (
  steps: SequenceStepDraft[],
  stepIndex: number,
  captured: DmxChannelUpdate[],
): SequenceStepDraft[] =>
  captured.reduce(
    (next, { channel, value }) => setCellValue(next, stepIndex, { kind: 'channel', channel, label: '' }, value),
    steps,
  );
```

`use-sequence-capture.ts`:

```ts
'use client';

import { dmxStore, type DmxChannelUpdate } from '@/lib/dmx/dmx-store';
import { useEffect, useState, type RefObject } from 'react';

export type SequenceCapture = {
  touchedCount: number;
  capturedValues: () => DmxChannelUpdate[];
  clear: () => void;
};

export const useSequenceCapture = (
  patchedChannels: ReadonlySet<number>,
  sentValues: RefObject<Map<number, number>>,
): SequenceCapture => {
  const [touched, setTouched] = useState<ReadonlySet<number>>(new Set());

  useEffect(
    () =>
      dmxStore.subscribe((state, previous) => {
        if (state.channels === previous.channels) {
          return;
        }
        const changed = state.channels.flatMap((value, index) => {
          const channel = index + 1;
          return value !== previous.channels[index] &&
            patchedChannels.has(channel) &&
            sentValues.current.get(channel) !== value
            ? [channel]
            : [];
        });
        if (changed.length > 0) {
          setTouched(current => new Set([...current, ...changed]));
        }
      }),
    [patchedChannels, sentValues],
  );

  return {
    touchedCount: touched.size,
    capturedValues: () => {
      const { channels } = dmxStore.getState();
      return [...touched]
        .sort((left, right) => left - right)
        .map(channel => ({ channel, value: channels[channel - 1] ?? 0 }));
    },
    clear: () => {
      setTouched(new Set());
    },
  };
};
```

- [ ] **Step 4: Run the tests**

Run: `nx test frontend -- sequence-capture`
Expected: PASS (3 tests).

- [ ] **Step 5: Integrate capture into `sequence-editor.tsx`**

Add these imports: `useMemo` from `react`; `useDmxStore` from `@/lib/dmx/dmx-store`; `appendCapturedStep` and `mergeCapturedIntoStep` from `./sequence-capture`; `useSequenceCapture` from `./use-sequence-capture`; `absoluteDmxChannel` from `./sequence-steps` (change the existing type-only import to `import { absoluteDmxChannel, type SequenceFixtureChannel } from './sequence-steps';`).

After the `livePreview` constant, add:

```tsx
const patchedChannels = useMemo(
  () =>
    new Set(
      fixtures.flatMap(fixture =>
        fixture.channels.map(channel => absoluteDmxChannel(fixture.startAddress, channel.channelNumber)),
      ),
    ),
  [fixtures],
);
const capture = useSequenceCapture(patchedChannels, livePreview.sentValues);
const functionsRunning = useDmxStore(state => state.runningFunctionIds.length > 0);

const storeAsStep = () => {
  const steps = appendCapturedStep(
    draft.steps,
    capture.capturedValues(),
    selectedStep === undefined ? undefined : draft.steps[selectedStep],
  );
  setDraft(current => ({ ...current, steps }));
  const cell = { row: range.focus.row, column: steps.length - 1 };
  setRange({ anchor: cell, focus: cell });
  capture.clear();
};

const updateStep = () => {
  if (selectedStep === undefined) {
    return;
  }
  const steps = mergeCapturedIntoStep(draft.steps, selectedStep, capture.capturedValues());
  setDraft(current => ({ ...current, steps }));
  capture.clear();
};
```

Insert this block after the Live `<Group>` and before `<Box flex={1} />`:

```tsx
<Stack gap={2} pb={6}>
  <Group gap="xs">
    <Text size="sm">
      {t(
        {
          id: 'ProjectFunction.capture.count',
          defaultMessage: '{count, plural, one {# channel} other {# channels}} captured',
        },
        { count: capture.touchedCount },
      )}
    </Text>
    <Button size="xs" variant="light" disabled={capture.touchedCount === 0} onClick={storeAsStep}>
      {t({ id: 'ProjectFunction.capture.storeAsStep', defaultMessage: 'Store as step' })}
    </Button>
    <Button
      size="xs"
      variant="light"
      disabled={capture.touchedCount === 0 || selectedStep === undefined}
      onClick={updateStep}
    >
      {t({ id: 'ProjectFunction.capture.updateStep', defaultMessage: 'Update step' })}
    </Button>
    <Button size="xs" variant="subtle" disabled={capture.touchedCount === 0} onClick={capture.clear}>
      {t({ id: 'ProjectFunction.capture.clear', defaultMessage: 'Clear' })}
    </Button>
  </Group>
  {functionsRunning ? (
    <Text size="xs" c="orange">
      {t({
        id: 'ProjectFunction.capture.runningWarning',
        defaultMessage: 'Running functions also change captured channels.',
      })}
    </Text>
  ) : null}
</Stack>
```

Add a test to `sequence-editor.spec.tsx`. It needs `import { act } from '@testing-library/react';` and `dmxStore` from `@/lib/dmx/dmx-store`:

```tsx
it('stores captured live values as a new step', async () => {
  const { user } = renderWithProviders(
    <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={vi.fn()} />,
  );
  act(() => {
    dmxStore.getState().applyDelta([{ channel: 1, value: 180 }]);
  });
  expect(screen.getByText('1 channel captured')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Store as step' }));
  expect(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 2' })).toHaveTextContent('180');
  expect(screen.getByText('0 channels captured')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the i18n sync procedure** with these German entries:

```json
"ProjectFunction.capture.clear": "Leeren",
"ProjectFunction.capture.count": "{count, plural, one {# Kanal} other {# Kanäle}} erfasst",
"ProjectFunction.capture.runningWarning": "Laufende Funktionen verändern ebenfalls erfasste Kanäle.",
"ProjectFunction.capture.storeAsStep": "Als Schritt speichern",
"ProjectFunction.capture.updateStep": "Schritt aktualisieren"
```

- [ ] **Step 7: Verify**

Run: `nx test frontend -- sequence && nx run-many --targets typecheck,lint --projects frontend`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
pnpm exec prettier --write "apps/frontend/src/app/[locale]/project/_components/sequence-capture.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-capture.spec.ts" "apps/frontend/src/app/[locale]/project/_components/use-sequence-capture.ts" "apps/frontend/src/app/[locale]/project/_components/use-sequence-capture.spec.ts" "apps/frontend/src/app/[locale]/project/_components/sequence-editor.tsx" "apps/frontend/src/app/[locale]/project/_components/sequence-editor.spec.tsx" apps/frontend/src/lang/en.json apps/frontend/src/lang/de.json
git add apps/frontend
git commit -m "feat(frontend): capture live universe changes into sequence steps"
```

---

### Task 8: Final verification and harness check

**Files:**

- Possibly modify: `AGENTS.md`

- [ ] **Step 1: Run the full "done" gates from `AGENTS.md`**

Run: `nx run-many --targets typecheck,lint && nx run-many --targets test && nx e2e frontend && nx run frontend:i18n-verify`
Expected: all PASS, with zero lint errors. Record the output.

- [ ] **Step 2: Manual smoke test** (optional, with the backend running)

Run `nx serve backend` and `nx dev frontend`. Then open `http://localhost:3001/de/project/<id>/functions`, create a function, and check:

- the grid scrolls with a sticky header, timing rows and label column;
- Live sends values, and switching it off restores them;
- moving a fader in the console popout increments the capture counter.

Stop both servers afterwards.

- [ ] **Step 3: Harness health-check**

The change set adds no apps, Nx targets, path aliases, env vars or commands. It does add new frontend routes under `project/[publicId]/(bare)/functions/`. Read the `### Frontend` section of `AGENTS.md`. It currently documents no individual routes, so the result is expected to be `Harness: up to date`. If a route list has been added in the meantime, add the two editor routes to it.

- [ ] **Step 4: Prettier on all changed files and the final commit (if anything changed)**

```bash
pnpm exec prettier --write $(git diff --name-only)
git status --short
```

Commit any remaining changes with `chore: final formatting for sequence editor`.
