import type { MidiFeedback } from '@/midi-mappings/midi-mapping';
import { registerEnumType } from '@nestjs/graphql';

export const VIRTUAL_CONSOLE_SCHEMA_VERSION = 1;
export const VIRTUAL_CONSOLE_DEFAULT_WIDTH = 1280;
export const VIRTUAL_CONSOLE_DEFAULT_HEIGHT = 720;
export const VIRTUAL_CONSOLE_MAX_NESTING_DEPTH = 8;
export const VIRTUAL_CONSOLE_SIZE_MIN = 1;
export const VIRTUAL_CONSOLE_SIZE_MAX = 4096;
export const VIRTUAL_CONSOLE_CONTROL_SIZE_MIN = 8;
export const VIRTUAL_CONSOLE_FONT_SIZE_MIN = 8;
export const VIRTUAL_CONSOLE_FONT_SIZE_MAX = 72;
export const VIRTUAL_CONSOLE_FONT_WEIGHT_MIN = 100;
export const VIRTUAL_CONSOLE_FONT_WEIGHT_MAX = 900;
export const VIRTUAL_CONSOLE_DEFAULT_PAGE_NAME = 'Page 1';
export const VIRTUAL_CONSOLE_DEFAULT_SNAP = 1;
export const VIRTUAL_CONSOLE_SNAP_MIN = 1;
export const VIRTUAL_CONSOLE_SNAP_MAX = 128;
export const VIRTUAL_CONSOLE_AUDIO_BANDS_MIN = 1;
export const VIRTUAL_CONSOLE_AUDIO_BANDS_MAX = 16;
export const VIRTUAL_CONSOLE_BEAT_DEFAULT_THRESHOLD = 20;

export const VIRTUAL_CONSOLE_CONTROL_TYPE = {
  Frame: 'frame',
  Slider: 'slider',
  Button: 'button',
  AudioTriggers: 'audioTriggers',
  GlobalTap: 'globalTap',
} as const;

export type VirtualConsoleControlType =
  (typeof VIRTUAL_CONSOLE_CONTROL_TYPE)[keyof typeof VIRTUAL_CONSOLE_CONTROL_TYPE];

export enum VirtualConsoleControlTypeEnum {
  frame = 'frame',
  slider = 'slider',
  button = 'button',
  audioTriggers = 'audioTriggers',
  globalTap = 'globalTap',
}

registerEnumType(VirtualConsoleControlTypeEnum, {
  name: 'VirtualConsoleControlType',
  description: 'Kind of virtual console control',
});

export enum VirtualConsoleSliderOrientation {
  vertical = 'vertical',
  horizontal = 'horizontal',
}

registerEnumType(VirtualConsoleSliderOrientation, {
  name: 'VirtualConsoleSliderOrientation',
  description: 'Slider orientation on the virtual console',
});

export enum VirtualConsoleSliderValueType {
  dmx = 'dmx',
  percentage = 'percentage',
}

export enum VirtualConsoleButtonMode {
  flash = 'flash',
  toggle = 'toggle',
}

registerEnumType(VirtualConsoleButtonMode, {
  name: 'VirtualConsoleButtonMode',
  description: 'Whether a virtual console button latches or runs only while held',
});

registerEnumType(VirtualConsoleSliderValueType, {
  name: 'VirtualConsoleSliderValueType',
  description: 'How a slider value is interpreted',
});

export enum VirtualConsoleAudioBarMode {
  none = 'none',
  channels = 'channels',
  function = 'function',
}

registerEnumType(VirtualConsoleAudioBarMode, {
  name: 'VirtualConsoleAudioBarMode',
  description: 'What an audio triggers bar drives',
});

export type VirtualConsoleChannelBinding = {
  projectFixturePublicId: string;
  channelAssignmentPublicId: string;
  /** Present in export documents to remap bindings after catalog re-import. */
  channelNumber?: number;
  /** Present in export documents to remap bindings when assignment publicIds change. */
  channelDefinitionPublicId?: string;
};

/** Volume (index 0) or one spectrum band of an audio triggers control; thresholds in percent. */
export type VirtualConsoleAudioBar = {
  mode: `${VirtualConsoleAudioBarMode}`;
  minThreshold: number;
  maxThreshold: number;
  channelBindings?: VirtualConsoleChannelBinding[];
  functionPublicId?: string;
  /** Present in export documents to remap a function binding after re-import. */
  functionName?: string;
};

/** Fade in, hold and fade out of a stepped step, each in percent of the measured time between beats. */
export type VirtualConsoleBeatTiming = { fadeIn: number; hold: number; fadeOut: number };

/** Steps a function on each bass onset of an audio triggers control; quieter onsets (percent) do not count. */
export type VirtualConsoleBeatBar = {
  minThreshold: number;
  functionPublicId?: string;
  /** Present in export documents to remap a function binding after re-import. */
  functionName?: string;
  /** Absent: each step keeps the sequence's own timing. */
  timing?: VirtualConsoleBeatTiming;
};

export type VirtualConsoleControl = {
  id: string;
  type: VirtualConsoleControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  backgroundColor: string;
  borderWidth?: number;
  borderColor?: string;
  children?: VirtualConsoleControl[];
  orientation?: `${VirtualConsoleSliderOrientation}`;
  foregroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  valueType?: `${VirtualConsoleSliderValueType}`;
  lowerLimit?: number | null;
  upperLimit?: number | null;
  channelBindings?: VirtualConsoleChannelBinding[];
  buttonMode?: `${VirtualConsoleButtonMode}`;
  functionPublicId?: string;
  /** Present in export documents to remap a function binding after re-import. */
  functionName?: string;
  /** MIDI mapping entry that drives this button or slider; ignored when no project device uses its mapping. */
  midiEntryPublicId?: string | null;
  /** Serials of the MIDI devices this control listens to and lights up on; empty means every device using the mapping. */
  midiDeviceSerials?: string[] | null;
  /** Overrides the entry's default LED feedback. */
  feedback?: MidiFeedback | null;
  /** Spectrum bands of an audio triggers control. */
  bandCount?: number;
  /** Volume bar followed by one bar per band (`bandCount + 1` entries). */
  audioBars?: VirtualConsoleAudioBar[];
  /** Absent on audio triggers controls saved before beat bars existed. */
  beatBar?: VirtualConsoleBeatBar;
  /** Step timing of a global tap control; absent: each tapped step keeps the sequence's own timing. */
  tapTiming?: VirtualConsoleBeatTiming;
};

export type VirtualConsolePage = {
  id: string;
  name: string;
  controls: VirtualConsoleControl[];
};

export type VirtualConsoleDocument = {
  schemaVersion: number;
  width: number;
  height: number;
  snap?: number;
  pages: VirtualConsolePage[];
};
