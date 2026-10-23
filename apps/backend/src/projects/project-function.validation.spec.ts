import { describe, expect, it } from 'vitest';
import { ProjectFunctionType, SequenceDirection, SequenceProperties, SequenceRunOrder } from './project-function';
import { assertSequenceProperties, buildProjectFunctionProperties } from './project-function.validation';

function sequence(overrides: Partial<SequenceProperties> = {}): SequenceProperties {
  return {
    direction: SequenceDirection.Forward,
    runOrder: SequenceRunOrder.Loop,
    steps: [
      {
        fadeIn: 0,
        hold: 100,
        fadeOut: 0,
        dmxValues: [{ channel: 1, value: 255 }],
      },
    ],
    ...overrides,
  };
}

describe('project function validation', () => {
  it('accepts steps in array order', () => {
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [
            { fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] },
            { fadeIn: 10, hold: 10, fadeOut: 10, dmxValues: [{ channel: 2, value: 0 }] },
          ],
        }),
      );
    }).not.toThrow();
  });

  it('rejects a duplicated channel, an out of range channel, and a negative time', () => {
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [
            {
              fadeIn: 0,
              hold: 0,
              fadeOut: 0,
              dmxValues: [
                { channel: 1, value: 1 },
                { channel: 1, value: 2 },
              ],
            },
          ],
        }),
      );
    }).toThrow(/duplicated/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 513, value: 1 }] }],
        }),
      );
    }).toThrow(/1 to 512/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: -1, hold: 0, fadeOut: 0, dmxValues: [] }],
        }),
      );
    }).toThrow(/0 or more/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1, value: 256 }] }],
        }),
      );
    }).toThrow(/0 to 255/);
  });

  it('rejects steps and channel values that are not arrays, and non-integer or too-small numbers', () => {
    expect(() => {
      assertSequenceProperties(sequence({ steps: undefined as unknown as SequenceProperties['steps'] }));
    }).toThrow(/steps must be an array/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 1.5, hold: 0, fadeOut: 0, dmxValues: [] }],
        }),
      );
    }).toThrow(/fadeIn/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: -1, fadeOut: 0, dmxValues: [] }],
        }),
      );
    }).toThrow(/hold/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: Number.NaN, dmxValues: [] }],
        }),
      );
    }).toThrow(/fadeOut/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: undefined as unknown as [] }],
        }),
      );
    }).toThrow(/dmxValues must be an array/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 0, value: 1 }] }],
        }),
      );
    }).toThrow(/1 to 512/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1.2, value: 1 }] }],
        }),
      );
    }).toThrow(/1 to 512/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1, value: -1 }] }],
        }),
      );
    }).toThrow(/0 to 255/);
    expect(() => {
      assertSequenceProperties(
        sequence({
          steps: [{ fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ channel: 1, value: 1.5 }] }],
        }),
      );
    }).toThrow(/0 to 255/);
  });

  it('requires sequence properties for a sequence function', () => {
    expect(() => {
      buildProjectFunctionProperties(ProjectFunctionType.Sequence, undefined);
    }).toThrow(/requires sequence properties/);
  });

  it('stores fixture public IDs without duplicates and leaves them unset when omitted', () => {
    const fixtureId = '0b9a7c55-3f3e-4f8e-9d43-2f6f0c1a2b3c';
    expect(
      buildProjectFunctionProperties(
        ProjectFunctionType.Sequence,
        sequence({ fixturePublicIds: [fixtureId, fixtureId] }),
      ).sequence.fixturePublicIds,
    ).toEqual([fixtureId]);
    expect(buildProjectFunctionProperties(ProjectFunctionType.Sequence, sequence()).sequence).not.toHaveProperty(
      'fixturePublicIds',
    );
  });
});
