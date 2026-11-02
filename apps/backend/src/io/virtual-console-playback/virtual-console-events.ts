import type { MidiFeedback } from '@/midi-mappings/midi-mapping';

export type VirtualConsoleLedState = 'off' | 'on' | 'monitor';

/** LED state of one bound MIDI entry; `feedback` is the control's override, null means the entry's default. */
export type VirtualConsoleFeedback = {
  entryPublicId: string;
  state: VirtualConsoleLedState;
  feedback: MidiFeedback | null;
};

export type VirtualConsoleEvents = {
  /** A press (value > 0) / release (0) for buttons, or a raw slider value in control units. */
  'virtualConsole.input': { controlId: string; value: number };
  /** A MIDI mapping entry was played: Note velocity or CC value 0-127 (Note-Off is 0). */
  'virtualConsole.midiInput': { entryPublicId: string; value: number };
  /** The client that pressed these controls is gone: flash buttons must not stay on. */
  'virtualConsole.inputsReleased': { controlIds: string[] };
  'virtualConsole.state.request': undefined;
  /** Current value per button/slider of the active project's saved console. */
  'virtualConsole.state': { values: Record<string, number> };
  /** LED state of every control bound to a MIDI entry. */
  'virtualConsole.feedback': { entries: VirtualConsoleFeedback[] };
};
