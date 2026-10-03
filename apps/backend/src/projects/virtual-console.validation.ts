import { InvalidVirtualConsoleException } from '@/projects/project.exceptions';
import {
  VIRTUAL_CONSOLE_CONTROL_SIZE_MIN,
  VIRTUAL_CONSOLE_CONTROL_TYPE,
  VIRTUAL_CONSOLE_DEFAULT_HEIGHT,
  VIRTUAL_CONSOLE_DEFAULT_PAGE_NAME,
  VIRTUAL_CONSOLE_DEFAULT_SNAP,
  VIRTUAL_CONSOLE_DEFAULT_WIDTH,
  VIRTUAL_CONSOLE_FONT_SIZE_MAX,
  VIRTUAL_CONSOLE_FONT_SIZE_MIN,
  VIRTUAL_CONSOLE_FONT_WEIGHT_MAX,
  VIRTUAL_CONSOLE_FONT_WEIGHT_MIN,
  VIRTUAL_CONSOLE_MAX_NESTING_DEPTH,
  VIRTUAL_CONSOLE_SCHEMA_VERSION,
  VIRTUAL_CONSOLE_SIZE_MAX,
  VIRTUAL_CONSOLE_SIZE_MIN,
  VIRTUAL_CONSOLE_SNAP_MAX,
  VIRTUAL_CONSOLE_SNAP_MIN,
  VirtualConsoleChannelBinding,
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
    snap: VIRTUAL_CONSOLE_DEFAULT_SNAP,
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

type ImportVirtualConsoleControl = VirtualConsoleControl & {
  channelBindings?: VirtualConsoleChannelBinding[] | null;
  children?: VirtualConsoleControl[] | null;
};

function sanitizeControlForImport(control: ImportVirtualConsoleControl): VirtualConsoleControl {
  const { channelBindings, children, ...rest } = control;
  const sanitized: VirtualConsoleControl = { ...rest };
  if (Array.isArray(channelBindings) && channelBindings.length > 0) {
    sanitized.channelBindings = channelBindings;
  }
  if (rest.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame) {
    sanitized.children = Array.isArray(children) ? children.map(sanitizeControlForImport) : [];
  }
  return sanitized;
}

export function sanitizeVirtualConsoleForImport(document: VirtualConsoleDocument): VirtualConsoleDocument {
  return {
    ...document,
    pages: document.pages.map(page => ({
      ...page,
      controls: page.controls.map(control => sanitizeControlForImport(control as ImportVirtualConsoleControl)),
    })),
  };
}

export function assertValidVirtualConsole(document: VirtualConsoleDocument): void {
  if (document.schemaVersion !== VIRTUAL_CONSOLE_SCHEMA_VERSION) {
    throw new InvalidVirtualConsoleException(
      `Unsupported virtual console schemaVersion ${document.schemaVersion}; expected ${VIRTUAL_CONSOLE_SCHEMA_VERSION}`,
    );
  }
  assertCanvasSize(document.width, 'width');
  assertCanvasSize(document.height, 'height');
  if (document.snap !== undefined) {
    if (
      !Number.isInteger(document.snap) ||
      document.snap < VIRTUAL_CONSOLE_SNAP_MIN ||
      document.snap > VIRTUAL_CONSOLE_SNAP_MAX
    ) {
      throw new InvalidVirtualConsoleException(
        `Virtual console snap must be an integer between ${VIRTUAL_CONSOLE_SNAP_MIN} and ${VIRTUAL_CONSOLE_SNAP_MAX}.`,
      );
    }
  }
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
  assertTypography(control);
  assertChannelBindings(control);

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

function assertTypography(control: VirtualConsoleControl): void {
  if (typeof control.fontFamily === 'string') {
    if (control.fontFamily.length < 1 || control.fontFamily.length > 128) {
      throw new InvalidVirtualConsoleException('Control fontFamily must be between 1 and 128 characters.');
    }
  }
  if (typeof control.fontSize === 'number') {
    if (
      !Number.isInteger(control.fontSize) ||
      control.fontSize < VIRTUAL_CONSOLE_FONT_SIZE_MIN ||
      control.fontSize > VIRTUAL_CONSOLE_FONT_SIZE_MAX
    ) {
      throw new InvalidVirtualConsoleException(
        `Control fontSize must be an integer between ${VIRTUAL_CONSOLE_FONT_SIZE_MIN} and ${VIRTUAL_CONSOLE_FONT_SIZE_MAX}.`,
      );
    }
  }
  if (typeof control.fontWeight === 'number') {
    if (
      !Number.isInteger(control.fontWeight) ||
      control.fontWeight < VIRTUAL_CONSOLE_FONT_WEIGHT_MIN ||
      control.fontWeight > VIRTUAL_CONSOLE_FONT_WEIGHT_MAX ||
      control.fontWeight % 100 !== 0
    ) {
      throw new InvalidVirtualConsoleException(
        `Control fontWeight must be a multiple of 100 between ${VIRTUAL_CONSOLE_FONT_WEIGHT_MIN} and ${VIRTUAL_CONSOLE_FONT_WEIGHT_MAX}.`,
      );
    }
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

function assertDmxLimit(value: number | null | undefined, field: string, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new InvalidVirtualConsoleException(`Control ${field} must be an integer between 0 and 255.`);
  }
  return value;
}

function assertSlider(control: VirtualConsoleControl): void {
  assertNoChildren(control);
  if (control.orientation !== 'vertical' && control.orientation !== 'horizontal') {
    throw new InvalidVirtualConsoleException('Slider orientation must be vertical or horizontal.');
  }
  if (control.valueType !== 'dmx' && control.valueType !== 'percentage') {
    throw new InvalidVirtualConsoleException('Slider valueType must be dmx or percentage.');
  }
  const lowerLimit = assertDmxLimit(control.lowerLimit, 'lowerLimit', 0);
  const upperLimit = assertDmxLimit(control.upperLimit, 'upperLimit', 255);
  if (lowerLimit > upperLimit) {
    throw new InvalidVirtualConsoleException('Slider lowerLimit must be less than or equal to upperLimit.');
  }
  assertColor(control.foregroundColor, 'foregroundColor');
}

function assertButton(control: VirtualConsoleControl): void {
  assertNoChildren(control);
  assertDmxLimit(control.upperLimit, 'upperLimit', 255);
  assertColor(control.foregroundColor, 'foregroundColor');
}

export type VirtualConsoleBindingFixture = {
  publicId: string;
  channelAssignmentPublicIds: ReadonlySet<string>;
  channelAssignmentPublicIdByChannelNumber?: ReadonlyMap<number, string>;
  channelAssignmentPublicIdByDefinitionPublicId?: ReadonlyMap<string, string>;
};

export type VirtualConsoleImportBindingHint = {
  channelNumber: number;
  channelDefinitionPublicId?: string;
};

export type VirtualConsoleImportBindingHints = Map<string, Map<string, VirtualConsoleImportBindingHint>>;

export function enrichVirtualConsoleForExport(
  virtualConsole: VirtualConsoleDocument | null | undefined,
  fixtures: readonly {
    publicId: string | null;
    fixtureChannelMode?: {
      fixtureChannelAssignments?: readonly {
        publicId: string | null;
        channelNumber: number;
        fixtureChannelDefinition?: { publicId: string | null } | null;
      }[];
    } | null;
  }[],
): VirtualConsoleDocument | null {
  if (!virtualConsole) {
    return null;
  }
  const metadataByKey = new Map<string, { channelNumber: number; channelDefinitionPublicId?: string }>();
  for (const fixture of fixtures) {
    if (!fixture.publicId) {
      continue;
    }
    for (const assignment of fixture.fixtureChannelMode?.fixtureChannelAssignments ?? []) {
      if (!assignment.publicId) {
        continue;
      }
      const key = `${fixture.publicId}:${assignment.publicId}`;
      const channelDefinitionPublicId = assignment.fixtureChannelDefinition?.publicId ?? undefined;
      metadataByKey.set(key, {
        channelNumber: assignment.channelNumber,
        ...(channelDefinitionPublicId ? { channelDefinitionPublicId } : {}),
      });
    }
  }

  const enrichControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const bindings = control.channelBindings?.map(binding => {
      const metadata = metadataByKey.get(`${binding.projectFixturePublicId}:${binding.channelAssignmentPublicId}`);
      if (!metadata) {
        return binding;
      }
      return {
        ...binding,
        channelNumber: metadata.channelNumber,
        ...(metadata.channelDefinitionPublicId
          ? { channelDefinitionPublicId: metadata.channelDefinitionPublicId }
          : {}),
      };
    });
    const next: VirtualConsoleControl = bindings ? { ...control, channelBindings: bindings } : control;
    if (control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame && control.children) {
      return { ...next, children: control.children.map(enrichControl) };
    }
    return next;
  };

  return {
    ...virtualConsole,
    pages: virtualConsole.pages.map(page => ({
      ...page,
      controls: page.controls.map(enrichControl),
    })),
  };
}

export function stripVirtualConsoleBindingHints(document: VirtualConsoleDocument): VirtualConsoleDocument {
  const stripControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const bindings = control.channelBindings?.map(binding => ({
      projectFixturePublicId: binding.projectFixturePublicId,
      channelAssignmentPublicId: binding.channelAssignmentPublicId,
    }));
    const next: VirtualConsoleControl =
      bindings && bindings.length > 0
        ? { ...control, channelBindings: bindings }
        : { ...control, channelBindings: undefined };
    if (control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame && control.children) {
      return { ...next, children: control.children.map(stripControl) };
    }
    return next;
  };

  return {
    ...document,
    pages: document.pages.map(page => ({
      ...page,
      controls: page.controls.map(stripControl),
    })),
  };
}

export async function remapVirtualConsoleBindingsForImport(
  document: VirtualConsoleDocument,
  fixtures: readonly VirtualConsoleBindingFixture[],
  assignmentChannelNumberByPublicId: (assignmentPublicId: string) => Promise<number | undefined>,
  importHints: VirtualConsoleImportBindingHints = new Map(),
): Promise<VirtualConsoleDocument> {
  const byFixture = new Map(fixtures.map(fixture => [fixture.publicId, fixture]));

  const remapControl = async (control: VirtualConsoleControl): Promise<VirtualConsoleControl> => {
    const bindings = control.channelBindings;
    let nextControl: VirtualConsoleControl = control;
    if (bindings && bindings.length > 0) {
      const remappedBindings: VirtualConsoleChannelBinding[] = [];
      for (const binding of bindings) {
        const fixture = byFixture.get(binding.projectFixturePublicId);
        if (!fixture) {
          continue;
        }
        if (fixture.channelAssignmentPublicIds.has(binding.channelAssignmentPublicId)) {
          remappedBindings.push({
            projectFixturePublicId: binding.projectFixturePublicId,
            channelAssignmentPublicId: binding.channelAssignmentPublicId,
          });
          continue;
        }
        const hint = importHints.get(binding.projectFixturePublicId)?.get(binding.channelAssignmentPublicId);
        const channelNumber =
          (await assignmentChannelNumberByPublicId(binding.channelAssignmentPublicId)) ??
          binding.channelNumber ??
          hint?.channelNumber;
        let replacement =
          channelNumber === undefined
            ? undefined
            : fixture.channelAssignmentPublicIdByChannelNumber?.get(channelNumber);
        if (!replacement) {
          const definitionPublicId = binding.channelDefinitionPublicId ?? hint?.channelDefinitionPublicId;
          if (definitionPublicId) {
            replacement = fixture.channelAssignmentPublicIdByDefinitionPublicId?.get(definitionPublicId);
          }
        }
        if (!replacement) {
          continue;
        }
        remappedBindings.push({
          projectFixturePublicId: binding.projectFixturePublicId,
          channelAssignmentPublicId: replacement,
        });
      }
      nextControl =
        remappedBindings.length > 0
          ? { ...control, channelBindings: remappedBindings }
          : { ...control, channelBindings: undefined };
    }
    if (control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame && control.children) {
      const children = await Promise.all(control.children.map(remapControl));
      nextControl = { ...nextControl, children };
    }
    return nextControl;
  };

  const pages = await Promise.all(
    document.pages.map(async page => ({
      ...page,
      controls: await Promise.all(page.controls.map(remapControl)),
    })),
  );
  return { ...document, pages };
}

export function assertVirtualConsoleChannelBindings(
  document: VirtualConsoleDocument,
  fixtures: readonly VirtualConsoleBindingFixture[],
): void {
  const assignmentsByFixture = new Map(fixtures.map(fixture => [fixture.publicId, fixture.channelAssignmentPublicIds]));
  for (const page of document.pages) {
    for (const control of page.controls) {
      assertControlBindingsResolve(control, assignmentsByFixture);
    }
  }
}

function assertControlBindingsResolve(
  control: VirtualConsoleControl,
  assignmentsByFixture: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  for (const binding of control.channelBindings ?? []) {
    const assignments = assignmentsByFixture.get(binding.projectFixturePublicId);
    if (!assignments?.has(binding.channelAssignmentPublicId)) {
      throw new InvalidVirtualConsoleException(
        `Channel binding ${binding.channelAssignmentPublicId} is not on project fixture ${binding.projectFixturePublicId}.`,
      );
    }
  }
  for (const child of control.children ?? []) {
    assertControlBindingsResolve(child, assignmentsByFixture);
  }
}

function assertChannelBindings(control: VirtualConsoleControl): void {
  const bindings = control.channelBindings;
  if (bindings === undefined) {
    return;
  }
  if (!Array.isArray(bindings)) {
    throw new InvalidVirtualConsoleException('Control channelBindings must be an array.');
  }
  const allowsBindings =
    control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Slider || control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Button;
  if (!allowsBindings && bindings.length > 0) {
    throw new InvalidVirtualConsoleException(`Control type ${control.type} cannot have channel bindings.`);
  }
  const seen = new Set<string>();
  for (const binding of bindings) {
    assertBinding(binding);
    const key = `${binding.projectFixturePublicId}:${binding.channelAssignmentPublicId}`;
    if (seen.has(key)) {
      throw new InvalidVirtualConsoleException(`Duplicate channel binding ${key}.`);
    }
    seen.add(key);
  }
}

function assertBinding(binding: unknown): asserts binding is VirtualConsoleChannelBinding {
  if (typeof binding !== 'object' || binding === null) {
    throw new InvalidVirtualConsoleException('Channel binding must be an object.');
  }
  const record = binding as VirtualConsoleChannelBinding;
  assertUuid(record.projectFixturePublicId, 'projectFixturePublicId');
  assertUuid(record.channelAssignmentPublicId, 'channelAssignmentPublicId');
  if (record.channelNumber !== undefined) {
    if (!Number.isInteger(record.channelNumber) || record.channelNumber < 1) {
      throw new InvalidVirtualConsoleException('Channel binding channelNumber must be a positive integer.');
    }
  }
  if (record.channelDefinitionPublicId !== undefined) {
    assertUuid(record.channelDefinitionPublicId, 'channelDefinitionPublicId');
  }
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
