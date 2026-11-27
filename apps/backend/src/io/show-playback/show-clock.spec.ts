import { describe, expect, it } from 'vitest';
import { ShowClock } from './show-clock';

const BUFFER = 1024;
const BUFFER_MS = (BUFFER / 48000) * 1000;

function clockAt(startMs = 0) {
  let now = startMs;
  const clock = new ShowClock(() => now);
  return {
    clock,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('ShowClock', () => {
  it('GIVEN no audio WHEN time passes THEN the position follows the wall clock from the start', () => {
    const { clock, advance } = clockAt();
    clock.start(5000);

    advance(250);

    expect(clock.positionMs()).toBe(5250);
  });

  it('GIVEN audio WHEN only the queued buffers were pulled THEN the position stays at the start', () => {
    const { clock, advance } = clockAt();
    clock.attachAudio(1000);

    clock.onPulled(BUFFER);
    clock.onPulled(BUFFER);
    advance(40);

    expect(clock.positionMs()).toBe(1000);
  });

  it('GIVEN audio WHEN buffers are played THEN the position counts them, interpolated by at most one buffer', () => {
    const { clock, advance } = clockAt();
    clock.attachAudio(0);
    for (let pull = 0; pull < 5; pull++) clock.onPulled(BUFFER);

    advance(10);
    expect(clock.positionMs()).toBeCloseTo(3 * BUFFER_MS + 10);

    advance(100);
    expect(clock.positionMs()).toBeCloseTo(4 * BUFFER_MS);
  });

  it('GIVEN an interpolated position WHEN the next pull lands THEN the position never runs backwards', () => {
    const { clock, advance } = clockAt();
    clock.attachAudio(0);
    for (let pull = 0; pull < 3; pull++) clock.onPulled(BUFFER);
    advance(BUFFER_MS);
    const before = clock.positionMs();

    clock.onPulled(BUFFER);

    expect(clock.positionMs()).toBeGreaterThanOrEqual(before);
  });

  it('GIVEN audio WHEN it is detached THEN the wall clock continues from the audio position', () => {
    const { clock, advance } = clockAt();
    clock.attachAudio(0);
    for (let pull = 0; pull < 4; pull++) clock.onPulled(BUFFER);
    const atDetach = clock.positionMs();

    clock.detachAudio();
    advance(100);

    expect(clock.positionMs()).toBeCloseTo(atDetach + 100);
  });
});
