import { InvalidVirtualConsoleException } from '@/projects/project.exceptions';
import {
  VIRTUAL_CONSOLE_CONTROL_SIZE_MIN,
  VIRTUAL_CONSOLE_CONTROL_TYPE,
  VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
  VIRTUAL_CONSOLE_DEFAULT_PAGE_NAME,
  VIRTUAL_CONSOLE_DEFAULT_WIDTH,
  VIRTUAL_CONSOLE_MAX_NESTING_DEPTH,
  VIRTUAL_CONSOLE_SCHEMA_VERSION,
  VIRTUAL_CONSOLE_SIZE_MAX,
  VIRTUAL_CONSOLE_SIZE_MIN,
  VirtualConsoleControl,
  VirtualConsoleControlType,
  VirtualConsoleDocument,
  VirtualConsolePage,
} from '@/projects/virtual-console';
import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function defaultVirtualConsoleDocument(): VirtualConsoleDocument {
  return {
    schemaVersion: VIRTUAL_CONSOLE_SCHEMA_VERSION,
    width: VIRTUAL_CONSOLE_DEFAULT_WIDTH,
    height: VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
    pages: [
      {
        id: randomUUID(),
        name: VIRTUAL_CONSOLE_DEFAULT_PAGE_NAME,
        controls: [],
      },
    ],
  };
}

export function normalizeVirtualConsole(value: VirtualConsoleDocument | null | undefined): VirtualConsoleDocument {
  if (value === null || value === undefined) {
    return defaultVirtualConsoleDocument();
  }
  return value;
}

export function assertValidVirtualConsole(document: VirtualConsoleDocument): void {
  if (document.schemaVersion !== VIRTUAL_CONSOLE_SCHEMA_VERSION) {
    throw new InvalidVirtualConsoleException(
      `Unsupported virtual console schemaVersion ${document.schemaVersion}; expected ${VIRTUAL_CONSOLE_SCHEMA_VERSION}`,
    );
  }
  assertCanvasSize(document.width, 'width');
  assertCanvasSize(document.height, 'height');
  if (!Array.isArray(document.pages) || document.pages.length < 1) {
    throw new InvalidVirtualConsoleException('Virtual console must have at least one page.');
  }

  const ids = new Set<string>();
  for (const page of document.pages) {
    assertPage(page, ids);
  }
}

function assertCanvasSize(value: number, field: string): void {
  if (!Number.isFinite(value) || value < VIRTUAL_CONSOLE_SIZE_MIN || value > VIRTUAL_CONSOLE_SIZE_MAX) {
    throw new InvalidVirtualConsoleException(
      `Virtual console ${field} must be between ${VIRTUAL_CONSOLE_SIZE_MIN} and ${VIRTUAL_CONSOLE_SIZE_MAX}.`,
    );
  }
}

function assertPage(page: VirtualConsolePage, ids: Set<string>): void {
  assertUuid(page.id, 'page id');
  assertUniqueId(page.id, ids);
  if (typeof page.name !== 'string' || page.name.length < 1 || page.name.length > 255) {
    throw new InvalidVirtualConsoleException('Page name must be between 1 and 255 characters.');
  }
  if (!Array.isArray(page.controls)) {
    throw new InvalidVirtualConsoleException('Page controls must be an array.');
  }
  for (const control of page.controls) {
    assertControl(control, ids, 1);
  }
}

function assertControl(control: VirtualConsoleControl, ids: Set<string>, depth: number): void {
  if (depth > VIRTUAL_CONSOLE_MAX_NESTING_DEPTH) {
    throw new InvalidVirtualConsoleException(
      `Virtual console controls cannot nest deeper than ${VIRTUAL_CONSOLE_MAX_NESTING_DEPTH}.`,
    );
  }
  assertUuid(control.id, 'control id');
  assertUniqueId(control.id, ids);
  assertControlType(control.type);
  assertLayout(control);
  assertColor(control.backgroundColor, 'backgroundColor');
  if (typeof control.label !== 'string' || control.label.length > 255) {
    throw new InvalidVirtualConsoleException('Control label must be at most 255 characters.');
  }

  switch (control.type) {
    case VIRTUAL_CONSOLE_CONTROL_TYPE.Frame:
      assertFrame(control, ids, depth);
      break;
    case VIRTUAL_CONSOLE_CONTROL_TYPE.Slider:
      assertSlider(control);
      break;
    case VIRTUAL_CONSOLE_CONTROL_TYPE.Button:
      assertButton(control);
      break;
  }
}

function assertControlType(type: string): asserts type is VirtualConsoleControlType {
  if (
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Frame &&
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Slider &&
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Button
  ) {
    throw new InvalidVirtualConsoleException(`Unknown virtual console control type ${type}.`);
  }
}

function assertLayout(control: VirtualConsoleControl): void {
  for (const field of ['x', 'y'] as const) {
    if (!Number.isFinite(control[field])) {
      throw new InvalidVirtualConsoleException(`Control ${field} must be a finite number.`);
    }
  }
  for (const field of ['width', 'height'] as const) {
    const value = control[field];
    if (!Number.isFinite(value) || value < VIRTUAL_CONSOLE_CONTROL_SIZE_MIN || value > VIRTUAL_CONSOLE_SIZE_MAX) {
      throw new InvalidVirtualConsoleException(
        `Control ${field} must be between ${VIRTUAL_CONSOLE_CONTROL_SIZE_MIN} and ${VIRTUAL_CONSOLE_SIZE_MAX}.`,
      );
    }
  }
}

function assertColor(value: string | undefined, field: string): void {
  if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) {
    throw new InvalidVirtualConsoleException(`Control ${field} must be a hex color.`);
  }
}

function assertFrame(control: VirtualConsoleControl, ids: Set<string>, depth: number): void {
  if (
    control.borderWidth === undefined ||
    !Number.isFinite(control.borderWidth) ||
    control.borderWidth < 0 ||
    control.borderWidth > 32
  ) {
    throw new InvalidVirtualConsoleException('Frame borderWidth must be between 0 and 32.');
  }
  assertColor(control.borderColor, 'borderColor');
  const children = control.children ?? [];
  if (!Array.isArray(children)) {
    throw new InvalidVirtualConsoleException('Frame children must be an array.');
  }
  for (const child of children) {
    assertControl(child, ids, depth + 1);
  }
}

function assertSlider(control: VirtualConsoleControl): void {
  assertNoChildren(control);
  if (control.orientation !== 'vertical' && control.orientation !== 'horizontal') {
    throw new InvalidVirtualConsoleException('Slider orientation must be vertical or horizontal.');
  }
  if (control.valueType !== 'dmx' && control.valueType !== 'percentage') {
    throw new InvalidVirtualConsoleException('Slider valueType must be dmx or percentage.');
  }
  assertColor(control.foregroundColor, 'foregroundColor');
}

function assertButton(control: VirtualConsoleControl): void {
  assertNoChildren(control);
  assertColor(control.foregroundColor, 'foregroundColor');
}

function assertNoChildren(control: VirtualConsoleControl): void {
  if (Array.isArray(control.children) && control.children.length > 0) {
    throw new InvalidVirtualConsoleException(`Control type ${control.type} cannot have children.`);
  }
}

function assertUuid(value: string, field: string): void {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new InvalidVirtualConsoleException(`Invalid ${field}.`);
  }
}

function assertUniqueId(id: string, ids: Set<string>): void {
  if (ids.has(id)) {
    throw new InvalidVirtualConsoleException(`Duplicate virtual console id ${id}.`);
  }
  ids.add(id);
}
