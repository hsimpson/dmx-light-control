import {
  ProjectFunctionProperties,
  ProjectFunctionType,
  SequenceProperties,
  SequenceStep,
} from '@/projects/project-function';
import { ProjectFunctionPropertiesException } from '@/projects/project.exceptions';

const DMX_CHANNEL_MIN = 1;
const DMX_CHANNEL_MAX = 512;
const DMX_VALUE_MAX = 255;

function assertNonNegativeInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ProjectFunctionPropertiesException(`${field} must be an integer of 0 or more.`);
  }
}

function assertStep(step: SequenceStep, index: number): void {
  assertNonNegativeInt(step.order, `Step ${index} order`);
  assertNonNegativeInt(step.fadeIn, `Step ${index} fadeIn`);
  assertNonNegativeInt(step.hold, `Step ${index} hold`);
  assertNonNegativeInt(step.fadeOut, `Step ${index} fadeOut`);
  if (!Array.isArray(step.dmxValues)) {
    throw new ProjectFunctionPropertiesException(`Step ${index} dmxValues must be an array.`);
  }
  const channels = new Set<number>();
  for (const entry of step.dmxValues) {
    if (!Number.isInteger(entry.channel) || entry.channel < DMX_CHANNEL_MIN || entry.channel > DMX_CHANNEL_MAX) {
      throw new ProjectFunctionPropertiesException(`Step ${index} channel must be an integer from 1 to 512.`);
    }
    if (!Number.isInteger(entry.value) || entry.value < 0 || entry.value > DMX_VALUE_MAX) {
      throw new ProjectFunctionPropertiesException(`Step ${index} value must be an integer from 0 to 255.`);
    }
    if (channels.has(entry.channel)) {
      throw new ProjectFunctionPropertiesException(`Step ${index} channel ${entry.channel} is duplicated.`);
    }
    channels.add(entry.channel);
  }
}

export function assertSequenceProperties(sequence: SequenceProperties): void {
  if (!Array.isArray(sequence.steps)) {
    throw new ProjectFunctionPropertiesException('Sequence steps must be an array.');
  }
  sequence.steps.forEach((step, index) => {
    assertStep(step, index);
  });
  const orders = sequence.steps.map(step => step.order).sort((left, right) => left - right);
  for (let index = 0; index < orders.length; index += 1) {
    if (orders[index] !== index) {
      throw new ProjectFunctionPropertiesException('Step order must be the consecutive integers 0..n-1.');
    }
  }
}

export function buildProjectFunctionProperties(
  type: ProjectFunctionType,
  sequence: SequenceProperties | null | undefined,
): ProjectFunctionProperties {
  if (!sequence) {
    throw new ProjectFunctionPropertiesException('A sequence function requires sequence properties.');
  }
  assertSequenceProperties(sequence);
  return {
    type,
    sequence: {
      direction: sequence.direction,
      runOrder: sequence.runOrder,
      steps: [...sequence.steps]
        .sort((left, right) => left.order - right.order)
        .map(step => ({
          order: step.order,
          fadeIn: step.fadeIn,
          hold: step.hold,
          fadeOut: step.fadeOut,
          dmxValues: step.dmxValues.map(entry => ({ channel: entry.channel, value: entry.value })),
        })),
    },
  };
}
