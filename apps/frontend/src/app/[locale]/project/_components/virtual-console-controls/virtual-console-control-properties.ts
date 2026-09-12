import type { ReactNode } from 'react';
import type { VirtualConsoleControl } from '../virtual-console-document';

export type VirtualConsoleControlMode = 'edit' | 'play';

export type VirtualConsoleControlProperties = {
  control: VirtualConsoleControl;
  mode: VirtualConsoleControlMode;
  selected?: boolean;
  children?: ReactNode;
};
