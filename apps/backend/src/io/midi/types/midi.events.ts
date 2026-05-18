import { MidiMessage } from 'midi';

export type MidiEvents = {
  'midi.inputOpened': undefined;
  'midi.outputOpened': undefined;
  'midi.inputMessage': MidiMessage;
  'midi.sendMessage': MidiMessage;
};
