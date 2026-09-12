import { registerEnumType } from '@nestjs/graphql';

export const VIRTUAL_CONSOLE_SCHEMA_VERSION = 1;
export const VIRTUAL_CONSOLE_DEFAULT_WIDTH = 1280;
export const VIRTUAL_CONSOLE_DEFAULT_HEIGHT = 720;
export const VIRTUAL_CONSOLE_MAX_NESTING_DEPTH = 8;
export const VIRTUAL_CONSOLE_SIZE_MIN = 1;
export const VIRTUAL_CONSOLE_SIZE_MAX = 4096;
export const VIRTUAL_CONSOLE_CONTROL_SIZE_MIN = 8;
export const VIRTUAL_CONSOLE_DEFAULT_PAGE_NAME = 'Page 1';

export const VIRTUAL_CONSOLE_CONTROL_TYPE = {
  Frame: 'frame',
  Slider: 'slider',
  Button: 'button',
} as const;

export type VirtualConsoleControlType =
  (typeof VIRTUAL_CONSOLE_CONTROL_TYPE)[keyof typeof VIRTUAL_CONSOLE_CONTROL_TYPE];

export enum VirtualConsoleControlTypeEnum {
  frame = 'frame',
  slider = 'slider',
  button = 'button',
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

registerEnumType(VirtualConsoleSliderValueType, {
  name: 'VirtualConsoleSliderValueType',
  description: 'How a slider value is interpreted',
});

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
  valueType?: `${VirtualConsoleSliderValueType}`;
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
  pages: VirtualConsolePage[];
};
