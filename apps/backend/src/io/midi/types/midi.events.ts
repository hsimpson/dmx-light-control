import { MidiMessage } from 'midi';

export type MidiEvents = {
  'midi.outputOpened': { portName: string };
  'midi.inputMessage': { portName: string; message: MidiMessage };
  'midi.sendMessage': { portName: string; message: MidiMessage };
};
