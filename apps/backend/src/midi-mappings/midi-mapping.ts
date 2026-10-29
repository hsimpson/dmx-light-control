import { registerEnumType } from '@nestjs/graphql';

export enum MidiControlType {
  Button = 'Button',
  Knob = 'Knob',
  Slider = 'Slider',
}

registerEnumType(MidiControlType, {
  name: 'MidiControlType',
  description: 'Kind of hardware control a MIDI mapping entry represents',
});

export enum MidiMessageType {
  Note = 'Note',
  ControlChange = 'ControlChange',
}

registerEnumType(MidiMessageType, {
  name: 'MidiMessageType',
  description: 'MIDI message kind the hardware control sends',
});

/** Sent back as Note-On: `behavior` is the MIDI channel (0–15), `color` the velocity (0–127). */
export type MidiLedState = {
  behavior: number;
  color: number;
};

export type MidiFeedback = {
  off: MidiLedState;
  on: MidiLedState;
};
