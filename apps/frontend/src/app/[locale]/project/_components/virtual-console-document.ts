export const VIRTUAL_CONSOLE_SCHEMA_VERSION = 1;
export const VIRTUAL_CONSOLE_DEFAULT_WIDTH = 1280;
export const VIRTUAL_CONSOLE_DEFAULT_HEIGHT = 720;
export const VIRTUAL_CONSOLE_CONTROL_SIZE_MIN = 8;
export const VIRTUAL_CONSOLE_PALETTE_MIME = 'application/x-virtual-console-control';

export const VIRTUAL_CONSOLE_RESIZE_HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

export type VirtualConsoleResizeHandle = (typeof VIRTUAL_CONSOLE_RESIZE_HANDLES)[number];

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

const omitGraphqlArtifacts = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitGraphqlArtifacts);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, nested]) => key !== '__typename' && nested !== null)
      .map(([key, nested]) => [key, omitGraphqlArtifacts(nested)]),
  );
};

export const cloneVirtualConsoleDocument = (document: VirtualConsoleDocument): VirtualConsoleDocument =>
  omitGraphqlArtifacts(structuredClone(document)) as VirtualConsoleDocument;

export const resizedControlBounds = (
  start: { x: number; y: number; width: number; height: number },
  deltaX: number,
  deltaY: number,
  handle: VirtualConsoleResizeHandle,
  minSize = VIRTUAL_CONSOLE_CONTROL_SIZE_MIN,
): { x: number; y: number; width: number; height: number } => {
  let { x, y, width, height } = start;
  if (handle === 'e' || handle === 'ne' || handle === 'se') {
    width = start.width + deltaX;
  }
  if (handle === 'w' || handle === 'nw' || handle === 'sw') {
    width = start.width - deltaX;
    x = start.x + deltaX;
  }
  if (handle === 's' || handle === 'se' || handle === 'sw') {
    height = start.height + deltaY;
  }
  if (handle === 'n' || handle === 'ne' || handle === 'nw') {
    height = start.height - deltaY;
    y = start.y + deltaY;
  }
  if (width < minSize) {
    if (handle === 'w' || handle === 'nw' || handle === 'sw') {
      x = start.x + start.width - minSize;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (handle === 'n' || handle === 'ne' || handle === 'nw') {
      y = start.y + start.height - minSize;
    }
    height = minSize;
  }
  return { x, y, width, height };
};

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

export const extractControl = (
  controls: VirtualConsoleControl[],
  id: string,
): { controls: VirtualConsoleControl[]; control: VirtualConsoleControl | undefined } => {
  let extracted: VirtualConsoleControl | undefined;
  const next: VirtualConsoleControl[] = [];
  for (const candidate of controls) {
    if (candidate.id === id) {
      extracted = candidate;
      continue;
    }
    if (candidate.children) {
      const nested = extractControl(candidate.children, id);
      if (nested.control) {
        extracted = nested.control;
        next.push({ ...candidate, children: nested.controls });
        continue;
      }
    }
    next.push(candidate);
  }
  return { controls: next, control: extracted };
};

export const findControlAbsolutePosition = (
  controls: VirtualConsoleControl[],
  id: string,
  originX = 0,
  originY = 0,
): { x: number; y: number } | undefined => {
  for (const candidate of controls) {
    const x = originX + candidate.x;
    const y = originY + candidate.y;
    if (candidate.id === id) {
      return { x, y };
    }
    if (candidate.children) {
      const nested = findControlAbsolutePosition(candidate.children, id, x, y);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
};

export const findFrameOrigin = (
  controls: VirtualConsoleControl[],
  parentId: string | null,
): { x: number; y: number } => {
  if (parentId === null) {
    return { x: 0, y: 0 };
  }
  return findControlAbsolutePosition(controls, parentId) ?? { x: 0, y: 0 };
};

export const reparentControl = (
  controls: VirtualConsoleControl[],
  id: string,
  parentId: string | null,
  x: number,
  y: number,
): VirtualConsoleControl[] => {
  const extracted = extractControl(controls, id);
  if (!extracted.control) {
    return controls;
  }
  return insertControlInTree(extracted.controls, parentId, { ...extracted.control, x, y });
};

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

export const findControlParentId = (
  controls: VirtualConsoleControl[],
  id: string,
  parentId: string | null = null,
): string | null | undefined => {
  for (const candidate of controls) {
    if (candidate.id === id) {
      return parentId;
    }
    if (candidate.children) {
      const nested = findControlParentId(candidate.children, id, candidate.id);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
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
