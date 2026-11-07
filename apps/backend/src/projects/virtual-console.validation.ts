import type { MidiLedState } from '@/midi-mappings/midi-mapping';
import { InvalidVirtualConsoleException } from '@/projects/project.exceptions';
import {
  VIRTUAL_CONSOLE_AUDIO_BANDS_MAX,
  VIRTUAL_CONSOLE_AUDIO_BANDS_MIN,
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
  VirtualConsoleAudioBar,
  VirtualConsoleAudioBarMode,
  VirtualConsoleBeatBar,
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
  if (Array.isArray(rest.audioBars)) {
    sanitized.audioBars = rest.audioBars.map(({ channelBindings: barBindings, ...bar }) =>
      Array.isArray(barBindings) && barBindings.length > 0 ? { ...bar, channelBindings: barBindings } : bar,
    );
  }
  return sanitized;
}

type BindingHolder = Pick<VirtualConsoleControl, 'channelBindings' | 'functionPublicId' | 'functionName'>;

/** Applies a binding patch to the control and to each of its audio and beat bars, which bind like small controls. */
function mapBindingHolders(
  control: VirtualConsoleControl,
  patch: (holder: BindingHolder) => BindingHolder,
): VirtualConsoleControl {
  return {
    ...control,
    ...patch(control),
    ...(control.audioBars ? { audioBars: control.audioBars.map(bar => ({ ...bar, ...patch(bar) })) } : {}),
    ...(control.beatBar ? { beatBar: { ...control.beatBar, ...patch(control.beatBar) } } : {}),
  };
}

const bindingHolders = (control: VirtualConsoleControl): BindingHolder[] => [
  control,
  ...(control.audioBars ?? []),
  ...(control.beatBar ? [control.beatBar] : []),
];

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
  assertFunctionBinding(control);
  assertMidiBinding(control);
  assertAudioFieldsAllowed(control);

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
    case VIRTUAL_CONSOLE_CONTROL_TYPE.AudioTriggers:
      assertAudioTriggers(control);
      break;
  }
}

function assertControlType(type: string): asserts type is VirtualConsoleControlType {
  if (
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Frame &&
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Slider &&
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Button &&
    type !== VIRTUAL_CONSOLE_CONTROL_TYPE.AudioTriggers
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

function assertAudioFieldsAllowed(control: VirtualConsoleControl): void {
  const hasAudioFields =
    (control.bandCount ?? undefined) !== undefined ||
    (control.audioBars ?? undefined) !== undefined ||
    (control.beatBar ?? undefined) !== undefined;
  if (hasAudioFields && control.type !== VIRTUAL_CONSOLE_CONTROL_TYPE.AudioTriggers) {
    throw new InvalidVirtualConsoleException(`Control type ${control.type} cannot have audio bars.`);
  }
}

function assertAudioTriggers(control: VirtualConsoleControl): void {
  assertNoChildren(control);
  const bandCount = control.bandCount;
  if (
    bandCount === undefined ||
    !isIntegerBetween(bandCount, VIRTUAL_CONSOLE_AUDIO_BANDS_MIN, VIRTUAL_CONSOLE_AUDIO_BANDS_MAX)
  ) {
    throw new InvalidVirtualConsoleException(
      `Audio triggers bandCount must be an integer between ${VIRTUAL_CONSOLE_AUDIO_BANDS_MIN} and ${VIRTUAL_CONSOLE_AUDIO_BANDS_MAX}.`,
    );
  }
  if (!Array.isArray(control.audioBars) || control.audioBars.length !== bandCount + 1) {
    throw new InvalidVirtualConsoleException('Audio triggers need one volume bar plus one bar per band.');
  }
  control.audioBars.forEach(assertAudioBar);
  if (control.beatBar) assertBeatBar(control.beatBar);
}

function assertBeatBar({ minThreshold, functionPublicId }: VirtualConsoleBeatBar): void {
  if (!isIntegerBetween(minThreshold, 0, 100)) {
    throw new InvalidVirtualConsoleException('Beat bar minThreshold must be an integer between 0 and 100.');
  }
  if ((functionPublicId ?? undefined) !== undefined && !UUID_PATTERN.test(functionPublicId ?? '')) {
    throw new InvalidVirtualConsoleException('Beat bar functionPublicId must be a UUID.');
  }
}

const AUDIO_BAR_MODES: readonly string[] = Object.values(VirtualConsoleAudioBarMode);

function assertAudioBar(bar: VirtualConsoleAudioBar): void {
  if (!AUDIO_BAR_MODES.includes(bar.mode)) {
    throw new InvalidVirtualConsoleException('Audio bar mode must be none, channels or function.');
  }
  assertBarThresholds(bar);
  assertBarChannels(bar);
  assertBarFunction(bar);
}

function assertBarThresholds({ minThreshold, maxThreshold }: VirtualConsoleAudioBar): void {
  if (!isIntegerBetween(minThreshold, 0, 100) || !isIntegerBetween(maxThreshold, 0, 100)) {
    throw new InvalidVirtualConsoleException('Audio bar thresholds must be integers between 0 and 100.');
  }
  if (minThreshold >= maxThreshold) {
    throw new InvalidVirtualConsoleException('Audio bar minThreshold must be less than maxThreshold.');
  }
}

function assertBarChannels(bar: VirtualConsoleAudioBar): void {
  const bindings = bar.channelBindings ?? [];
  if (bar.mode !== 'channels' && bindings.length > 0) {
    throw new InvalidVirtualConsoleException('Only an audio bar in channels mode can bind channels.');
  }
  assertBindingList(bindings);
}

// A stale functionName would rebind a function on import that the user never chose for this bar.
function assertBarFunction(bar: VirtualConsoleAudioBar): void {
  const functionPublicId = bar.functionPublicId ?? undefined;
  const hasFunction = functionPublicId !== undefined || (bar.functionName ?? undefined) !== undefined;
  if (hasFunction && bar.mode !== 'function') {
    throw new InvalidVirtualConsoleException('Only an audio bar in function mode can bind a function.');
  }
  if (functionPublicId !== undefined && !UUID_PATTERN.test(functionPublicId)) {
    throw new InvalidVirtualConsoleException('Audio bar functionPublicId must be a UUID.');
  }
}

function assertFunctionBinding(control: VirtualConsoleControl): void {
  const functionPublicId = control.functionPublicId ?? undefined;
  const functionName = control.functionName ?? undefined;
  const buttonMode = control.buttonMode ?? undefined;
  const hasFunction = functionPublicId !== undefined || functionName !== undefined;
  if (!hasFunction && buttonMode === undefined) {
    return;
  }
  if (control.type !== VIRTUAL_CONSOLE_CONTROL_TYPE.Button) {
    throw new InvalidVirtualConsoleException(`Control type ${control.type} cannot have a function binding.`);
  }
  if (functionPublicId !== undefined && !UUID_PATTERN.test(functionPublicId)) {
    throw new InvalidVirtualConsoleException('Button functionPublicId must be a UUID.');
  }
  if (functionPublicId !== undefined && (control.channelBindings?.length ?? 0) > 0) {
    throw new InvalidVirtualConsoleException('A button cannot bind both channels and a function.');
  }
}

function assertMidiBinding(control: VirtualConsoleControl): void {
  const midiEntryPublicId = control.midiEntryPublicId ?? undefined;
  const feedback = control.feedback ?? undefined;
  if (midiEntryPublicId === undefined && feedback === undefined) {
    return;
  }
  if (control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame) {
    throw new InvalidVirtualConsoleException('A frame cannot have a MIDI input.');
  }
  if (midiEntryPublicId !== undefined && !UUID_PATTERN.test(midiEntryPublicId)) {
    throw new InvalidVirtualConsoleException('Control midiEntryPublicId must be a UUID.');
  }
  if (feedback !== undefined) {
    assertLedState(feedback.off, 'off');
    assertLedState(feedback.on, 'on');
    if (feedback.monitor !== undefined && feedback.monitor !== null) {
      assertLedState(feedback.monitor, 'monitor');
    }
  }
}

function assertLedState(state: MidiLedState | undefined, name: string): void {
  if (!state || !isIntegerBetween(state.behavior, 0, 15) || !isIntegerBetween(state.color, 0, 127)) {
    throw new InvalidVirtualConsoleException(
      `Feedback ${name} needs a behavior between 0 and 15 and a color between 0 and 127.`,
    );
  }
}

const isIntegerBetween = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

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
  functions: readonly { publicId: string | null; name: string }[] = [],
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

  const functionNameById = new Map(functions.flatMap(fn => (fn.publicId ? [[fn.publicId, fn.name] as const] : [])));

  const enrichHolder = (holder: BindingHolder): BindingHolder => {
    const functionName = holder.functionPublicId ? functionNameById.get(holder.functionPublicId) : undefined;
    const withFunctionName: BindingHolder = functionName ? { ...holder, functionName } : holder;
    const bindings = withFunctionName.channelBindings?.map(binding => {
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
    return bindings ? { ...withFunctionName, channelBindings: bindings } : withFunctionName;
  };

  const enrichControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const next = mapBindingHolders(control, enrichHolder);
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
  const stripHolder = (holder: BindingHolder): BindingHolder => {
    const bindings = holder.channelBindings?.map(binding => ({
      projectFixturePublicId: binding.projectFixturePublicId,
      channelAssignmentPublicId: binding.channelAssignmentPublicId,
    }));
    return { functionName: undefined, channelBindings: bindings && bindings.length > 0 ? bindings : undefined };
  };

  const stripControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const next = mapBindingHolders(control, stripHolder);
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

export function remapVirtualConsoleFunctionsForImport(
  document: VirtualConsoleDocument,
  functions: readonly { publicId: string; name: string }[],
): VirtualConsoleDocument {
  const ids = new Set(functions.map(fn => fn.publicId));
  const idByName = new Map(functions.map(fn => [fn.name, fn.publicId]));

  const remapHolder = ({ functionName, functionPublicId }: BindingHolder): BindingHolder => {
    if (functionPublicId && ids.has(functionPublicId)) return { functionName: undefined, functionPublicId };
    const remapped = functionName ? idByName.get(functionName) : undefined;
    return { functionName: undefined, functionPublicId: remapped };
  };

  const remapControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const next = mapBindingHolders(control, remapHolder);
    if (control.type === VIRTUAL_CONSOLE_CONTROL_TYPE.Frame && control.children) {
      return { ...next, children: control.children.map(remapControl) };
    }
    return next;
  };

  return {
    ...document,
    pages: document.pages.map(page => ({
      ...page,
      controls: page.controls.map(remapControl),
    })),
  };
}

export function removeFunctionBindings(
  document: VirtualConsoleDocument,
  functionPublicId: string,
): VirtualConsoleDocument {
  // The name goes too: on a later import it would rebind a new function that merely has the same name.
  const stripHolder = ({ functionPublicId: boundId, functionName }: BindingHolder): BindingHolder =>
    boundId === functionPublicId
      ? { functionPublicId: undefined, functionName: undefined }
      : { functionPublicId: boundId ?? undefined, functionName };

  const stripControl = (control: VirtualConsoleControl): VirtualConsoleControl => {
    const next = mapBindingHolders(control, stripHolder);
    return control.children ? { ...next, children: control.children.map(stripControl) } : next;
  };

  return {
    ...document,
    pages: document.pages.map(page => ({
      ...page,
      controls: page.controls.map(stripControl),
    })),
  };
}

export function assertVirtualConsoleFunctionBindings(
  document: VirtualConsoleDocument,
  functionPublicIds: ReadonlySet<string>,
): void {
  const assertControlFunction = (control: VirtualConsoleControl): void => {
    for (const { functionPublicId } of bindingHolders(control)) {
      if (functionPublicId && !functionPublicIds.has(functionPublicId)) {
        throw new InvalidVirtualConsoleException(`Function ${functionPublicId} does not belong to this project.`);
      }
    }
    for (const child of control.children ?? []) {
      assertControlFunction(child);
    }
  };
  for (const page of document.pages) {
    for (const control of page.controls) {
      assertControlFunction(control);
    }
  }
}

export async function remapVirtualConsoleBindingsForImport(
  document: VirtualConsoleDocument,
  fixtures: readonly VirtualConsoleBindingFixture[],
  assignmentChannelNumberByPublicId: (assignmentPublicId: string) => Promise<number | undefined>,
  importHints: VirtualConsoleImportBindingHints = new Map(),
): Promise<VirtualConsoleDocument> {
  const byFixture = new Map(fixtures.map(fixture => [fixture.publicId, fixture]));

  const remapBindings = async (bindings: readonly VirtualConsoleChannelBinding[]) => {
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
        channelNumber === undefined ? undefined : fixture.channelAssignmentPublicIdByChannelNumber?.get(channelNumber);
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
    return remappedBindings.length > 0 ? remappedBindings : undefined;
  };

  const remapHolder = async <T extends BindingHolder>(holder: T): Promise<T> =>
    holder.channelBindings && holder.channelBindings.length > 0
      ? { ...holder, channelBindings: await remapBindings(holder.channelBindings) }
      : holder;

  const remapControl = async (control: VirtualConsoleControl): Promise<VirtualConsoleControl> => {
    let nextControl = await remapHolder(control);
    if (control.audioBars) {
      nextControl = { ...nextControl, audioBars: await Promise.all(control.audioBars.map(remapHolder)) };
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
  for (const binding of bindingHolders(control).flatMap(holder => holder.channelBindings ?? [])) {
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
  assertBindingList(bindings);
}

function assertBindingList(bindings: readonly VirtualConsoleChannelBinding[]): void {
  if (!Array.isArray(bindings)) {
    throw new InvalidVirtualConsoleException('Channel bindings must be an array.');
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
