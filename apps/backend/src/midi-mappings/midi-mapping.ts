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

export enum MidiLedType {
  Rgb = 'Rgb',
  Single = 'Single',
}

registerEnumType(MidiLedType, {
  name: 'MidiLedType',
  description: 'LED kind of a hardware control: RGB (behaviors + color palette) or a single-color LED',
});

/** A named LED behavior (Note-On channel) or color (velocity); `hex` only for colors, as a swatch. */
export type MidiLedOption = { name: string; value: number; hex?: string | null };

export type MidiLedPalette = { behaviors: MidiLedOption[]; colors: MidiLedOption[] };

/** Per LED type, the named choices the editors offer; stored feedback stays numeric. */
export type MidiLedPalettes = { rgb?: MidiLedPalette | null; single?: MidiLedPalette | null };

/** Sent back as Note-On: `behavior` is the MIDI channel (0–15), `color` the velocity (0–127). */
export type MidiLedState = {
  behavior: number;
  color: number;
};

/** `monitor`: the bound button's function runs but was started by something else (falls back to `on`). */
export type MidiFeedback = {
  off: MidiLedState;
  on: MidiLedState;
  monitor?: MidiLedState | null;
};
