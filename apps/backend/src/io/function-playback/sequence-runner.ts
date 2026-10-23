import { SequenceDirection, SequenceProperties, SequenceRunOrder, SequenceStep } from '@/projects/project-function';

export type SequenceChannelValue = {
  channel: number;
  value: number;
};

export type SequenceFrame = {
  values: SequenceChannelValue[];
  finished: boolean;
};

type LevelMap = Map<number, number>;

function targetMap(step: SequenceStep): LevelMap {
  return new Map(step.dmxValues.map(entry => [entry.channel, entry.value]));
}

function stepDuration(step: SequenceStep): number {
  return step.fadeIn + step.hold + step.fadeOut;
}

function orderedSteps(sequence: SequenceProperties): SequenceStep[] {
  const steps = [...sequence.steps];
  return sequence.direction === SequenceDirection.Backward ? steps.reverse() : steps;
}

function playIndex(index: number, count: number, runOrder: SequenceRunOrder): number {
  if (count <= 1) {
    return 0;
  }
  if (runOrder === SequenceRunOrder.PingPong) {
    const cycle = 2 * (count - 1);
    const position = index % cycle;
    return position < count ? position : cycle - position;
  }
  return index % count;
}

function lerp(from: LevelMap, to: LevelMap, ratio: number): LevelMap {
  const channels = new Set<number>([...from.keys(), ...to.keys()]);
  const result: LevelMap = new Map();
  for (const channel of channels) {
    const start = from.get(channel) ?? 0;
    const end = to.get(channel) ?? 0;
    const value = Math.round(start + (end - start) * ratio);
    result.set(channel, Math.min(255, Math.max(0, value)));
  }
  return result;
}

function endState(step: SequenceStep): LevelMap {
  if (step.fadeOut > 0) {
    return new Map();
  }
  return targetMap(step);
}

function sample(step: SequenceStep, from: LevelMap, elapsed: number): LevelMap {
  const target = targetMap(step);
  if (elapsed < step.fadeIn) {
    return lerp(from, target, step.fadeIn === 0 ? 1 : elapsed / step.fadeIn);
  }
  if (elapsed < step.fadeIn + step.hold) {
    return target;
  }
  const fadeElapsed = elapsed - step.fadeIn - step.hold;
  return lerp(target, new Map(), step.fadeOut === 0 ? 1 : fadeElapsed / step.fadeOut);
}

function toList(levels: LevelMap): SequenceChannelValue[] {
  return [...levels.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([channel, value]) => ({ channel, value }));
}

export function sequenceFrame(sequence: SequenceProperties, elapsedMs: number): SequenceFrame {
  const steps = orderedSteps(sequence);
  if (steps.length === 0) {
    return { values: [], finished: true };
  }

  let remaining = Math.max(0, elapsedMs);
  let from: LevelMap = new Map();
  let index = 0;
  let zeroSteps = 0;

  for (let guard = 0; guard <= elapsedMs + steps.length + 1; guard += 1) {
    if (sequence.runOrder === SequenceRunOrder.SingleShot && index >= steps.length) {
      return { values: toList(from), finished: true };
    }
    const step = steps[playIndex(index, steps.length, sequence.runOrder)] ?? steps[0];
    if (step === undefined) {
      return { values: toList(from), finished: true };
    }
    const duration = stepDuration(step);
    if (duration === 0) {
      from = endState(step);
      index += 1;
      zeroSteps += 1;
      if (zeroSteps > steps.length) {
        return { values: toList(from), finished: sequence.runOrder === SequenceRunOrder.SingleShot };
      }
      continue;
    }
    zeroSteps = 0;
    if (remaining < duration) {
      return { values: toList(sample(step, from, remaining)), finished: false };
    }
    remaining -= duration;
    from = endState(step);
    index += 1;
  }
  return { values: toList(from), finished: true };
}
