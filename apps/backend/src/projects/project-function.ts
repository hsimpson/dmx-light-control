import { registerEnumType } from '@nestjs/graphql';

export enum ProjectFunctionType {
  Sequence = 'Sequence',
}

registerEnumType(ProjectFunctionType, {
  name: 'ProjectFunctionType',
  description: 'Kind of project function',
});

export enum SequenceDirection {
  Forward = 'forward',
  Backward = 'backward',
}

registerEnumType(SequenceDirection, {
  name: 'SequenceDirection',
  description: 'Order in which a sequence walks its steps',
});

export enum SequenceRunOrder {
  Loop = 'loop',
  SingleShot = 'singleShot',
  PingPong = 'pingPong',
}

registerEnumType(SequenceRunOrder, {
  name: 'SequenceRunOrder',
  description: 'How a sequence repeats after its last step',
});

export type SequenceStepDmxValue = {
  channel: number;
  value: number;
};

export type SequenceStep = {
  fadeIn: number;
  hold: number;
  fadeOut: number;
  dmxValues: SequenceStepDmxValue[];
};

export type SequenceProperties = {
  direction: SequenceDirection;
  runOrder: SequenceRunOrder;
  steps: SequenceStep[];
};

export type ProjectFunctionProperties = {
  type: ProjectFunctionType.Sequence;
  sequence: SequenceProperties;
};
