import { describe, expect, it } from 'vitest';
import { buildFixtureLabelPlacements, getFixtureRowSegments } from './universe-view.utils';

describe('getFixtureRowSegments', () => {
  it('returns a single segment for a fixture within one row', () => {
    expect(getFixtureRowSegments(5, 8)).toEqual([{ gridColumn: 5, gridRow: 1, columnSpan: 8 }]);
  });

  it('splits segments when a fixture wraps to the next row', () => {
    expect(getFixtureRowSegments(22, 5)).toEqual([
      { gridColumn: 22, gridRow: 1, columnSpan: 3 },
      { gridColumn: 1, gridRow: 2, columnSpan: 2 },
    ]);
  });
});

describe('buildFixtureLabelPlacements', () => {
  it('numbers fixtures by start address and spans from the start channel', () => {
    const placements = buildFixtureLabelPlacements(
      [
        { publicId: 'pf-2', startAddress: 10, fixture: { name: 'Mover' } },
        { publicId: 'pf-1', startAddress: 1, fixture: { name: 'PAR 64' } },
      ],
      () => 3,
    );

    expect(placements).toEqual([
      {
        fixtureNumber: 1,
        name: 'PAR 64',
        fixtureVariant: 0,
        gridColumn: 1,
        gridRow: 1,
        columnSpan: 3,
      },
      {
        fixtureNumber: 2,
        name: 'Mover',
        fixtureVariant: 1,
        gridColumn: 10,
        gridRow: 1,
        columnSpan: 3,
      },
    ]);
  });
});
