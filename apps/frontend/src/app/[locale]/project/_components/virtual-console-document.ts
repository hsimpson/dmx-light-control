export const VIRTUAL_CONSOLE_SCHEMA_VERSION = 1;
export const VIRTUAL_CONSOLE_DEFAULT_WIDTH = 1280;
export const VIRTUAL_CONSOLE_DEFAULT_HEIGHT = 720;
export const VIRTUAL_CONSOLE_PALETTE_MIME = 'application/x-virtual-console-control';

export type VirtualConsoleControlType = 'frame' | 'slider' | 'button';
export type VirtualConsoleSliderOrientation = 'vertical' | 'horizontal';
export type VirtualConsoleSliderValueType = 'dmx' | 'percentage';

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
  orientation?: VirtualConsoleSliderOrientation;
  foregroundColor?: string;
  valueType?: VirtualConsoleSliderValueType;
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

export const createDefaultVirtualConsoleDocument = (): VirtualConsoleDocument => ({
  schemaVersion: VIRTUAL_CONSOLE_SCHEMA_VERSION,
  width: VIRTUAL_CONSOLE_DEFAULT_WIDTH,
  height: VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
  pages: [
    {
      id: crypto.randomUUID(),
      name: 'Page 1',
      controls: [],
    },
  ],
});

export const createControl = (type: VirtualConsoleControlType, x: number, y: number): VirtualConsoleControl => {
  const id = crypto.randomUUID();
  switch (type) {
    case 'frame':
      return {
        id,
        type,
        x,
        y,
        width: 220,
        height: 180,
        label: 'Frame',
        backgroundColor: '#1a1b1e',
        borderWidth: 2,
        borderColor: '#868e96',
        children: [],
      };
    case 'slider':
      return {
        id,
        type,
        x,
        y,
        width: 36,
        height: 140,
        label: 'Slider',
        backgroundColor: '#25262b',
        foregroundColor: '#4dabf7',
        orientation: 'vertical',
        valueType: 'dmx',
      };
    case 'button':
      return {
        id,
        type,
        x,
        y,
        width: 88,
        height: 40,
        label: 'Button',
        backgroundColor: '#228be6',
        foregroundColor: '#ffffff',
      };
  }
};

export const cloneVirtualConsoleDocument = (document: VirtualConsoleDocument): VirtualConsoleDocument =>
  structuredClone(document);

export const findControl = (controls: VirtualConsoleControl[], id: string): VirtualConsoleControl | undefined => {
  for (const control of controls) {
    if (control.id === id) {
      return control;
    }
    if (control.children) {
      const nested = findControl(control.children, id);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
};

export const updateControlInTree = (
  controls: VirtualConsoleControl[],
  id: string,
  patch: Partial<VirtualConsoleControl>,
): VirtualConsoleControl[] =>
  controls.map(control => {
    if (control.id === id) {
      return { ...control, ...patch };
    }
    if (control.children) {
      return { ...control, children: updateControlInTree(control.children, id, patch) };
    }
    return control;
  });

export const insertControlInTree = (
  controls: VirtualConsoleControl[],
  parentId: string | null,
  control: VirtualConsoleControl,
): VirtualConsoleControl[] => {
  if (parentId === null) {
    return [...controls, control];
  }
  return controls.map(candidate => {
    if (candidate.id === parentId) {
      return { ...candidate, children: [...(candidate.children ?? []), control] };
    }
    if (candidate.children) {
      return { ...candidate, children: insertControlInTree(candidate.children, parentId, control) };
    }
    return candidate;
  });
};

export const findDropTarget = (
  controls: VirtualConsoleControl[],
  x: number,
  y: number,
  ignoreId?: string,
): { parentId: string | null; localX: number; localY: number } => {
  for (let index = controls.length - 1; index >= 0; index -= 1) {
    const control = controls[index];
    if (!control || control.id === ignoreId || control.type !== 'frame') {
      continue;
    }
    if (x < control.x || y < control.y || x > control.x + control.width || y > control.y + control.height) {
      continue;
    }
    const nested = findDropTarget(control.children ?? [], x - control.x, y - control.y, ignoreId);
    if (nested.parentId) {
      return nested;
    }
    return { parentId: control.id, localX: x - control.x, localY: y - control.y };
  }
  return { parentId: null, localX: x, localY: y };
};
