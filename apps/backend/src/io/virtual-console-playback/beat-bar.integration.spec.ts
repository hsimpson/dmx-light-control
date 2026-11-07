import { AppEventEmitter } from '@/events/app-event-emitter';
import { DmxUniverseService } from '@/io/dmx/dmx-universe.service';
import { FunctionPlaybackService } from '@/io/function-playback/function-playback.service';
import { ProjectFunctionType, SequenceDirection, SequenceRunOrder } from '@/projects/project-function';
import type { ProjectRepository } from '@/projects/repositories/project.repository';
import type { ProjectFunctionRepository } from '@/projects/repositories/project-function.repository';
import type { VirtualConsoleControl } from '@/projects/virtual-console';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VirtualConsolePlaybackService } from './virtual-console-playback.service';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const FUNCTION_ID = '99999999-9999-4999-8999-999999999999';
const CHANNEL = 4;
const FIRST_STEP = 80;
const SECOND_STEP = 200;

const idleBar = { mode: 'none', minThreshold: 20, maxThreshold: 80 } as const;

const base = (id: string, type: VirtualConsoleControl['type']) => ({
  id,
  type,
  x: 0,
  y: 0,
  width: 80,
  height: 80,
  label: id,
  backgroundColor: '#000000',
});

const beatControl = (id: string, minThreshold = 20): VirtualConsoleControl => ({
  ...base(id, 'audioTriggers'),
  bandCount: 1,
  audioBars: [idleBar, idleBar],
  beatBar: { minThreshold, functionPublicId: FUNCTION_ID },
});

const levelControl = (id: string): VirtualConsoleControl => ({
  ...base(id, 'audioTriggers'),
  bandCount: 1,
  audioBars: [{ ...idleBar, mode: 'function', functionPublicId: FUNCTION_ID }, idleBar],
});

const button = (id: string, buttonMode: 'flash' | 'toggle'): VirtualConsoleControl => ({
  ...base(id, 'button'),
  buttonMode,
  functionPublicId: FUNCTION_ID,
});

const row = (runOrder: SequenceRunOrder) => ({
  publicId: FUNCTION_ID,
  properties: {
    type: ProjectFunctionType.Sequence,
    sequence: {
      direction: SequenceDirection.Forward,
      runOrder,
      steps: [
        { fadeIn: 0, hold: 1000, fadeOut: 0, dmxValues: [{ channel: CHANNEL, value: FIRST_STEP }] },
        { fadeIn: 0, hold: 1000, fadeOut: 0, dmxValues: [{ channel: CHANNEL, value: SECOND_STEP }] },
      ],
    },
  },
});

const loaded = (controls: VirtualConsoleControl[]) => ({
  publicId: PROJECT_ID,
  virtualConsole: { schemaVersion: 1, width: 1280, height: 720, pages: [{ id: 'page', name: 'Page 1', controls }] },
  projectFixtures: [],
});

/** Mean square whose volume level reads `level` (0..1 over -60..0 dB). */
const frameAt = (level: number) => ({
  power: [],
  sampleRate: 48000,
  meanSquare: level === 0 ? 0 : 10 ** ((level * 60 - 60) / 10) / 2,
});

describe('Beat bar with real function playback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function rig(controls: VirtualConsoleControl[], runOrder = SequenceRunOrder.Loop) {
    vi.useFakeTimers();
    const emitter = new AppEventEmitter(new EventEmitter2());
    const universe = new DmxUniverseService();
    const functions = { findOneByPublicId: vi.fn().mockResolvedValue(row(runOrder)) };
    const playback = new FunctionPlaybackService(functions as unknown as ProjectFunctionRepository, universe, emitter);
    playback.onModuleInit();
    const projects = { findOneByPublicIdWithFixtures: vi.fn().mockResolvedValue(loaded(controls)) };
    const service = new VirtualConsolePlaybackService(projects as unknown as ProjectRepository, emitter);
    service.onModuleInit();
    await service.reload(PROJECT_ID);

    const settle = async () => {
      await vi.advanceTimersByTimeAsync(0);
    };
    const press = async (controlId: string, value = 1) => {
      emitter.emit('virtualConsole.input', { controlId, value });
      await settle();
    };
    /** Toggle controls react to the press only; a press and a release is one click. */
    const click = async (controlId: string) => {
      await press(controlId, 1);
      await press(controlId, 0);
    };
    const beat = () => {
      emitter.emit('soundInput.beat', { level: 0.8 });
    };
    const play = async (level: number, frames = 20) => {
      for (let frame = 0; frame < frames; frame++) {
        await vi.advanceTimersByTimeAsync(50);
        emitter.emit('soundInput.spectrum', frameAt(level));
      }
      await settle();
    };
    const save = async (next: VirtualConsoleControl[]) => {
      projects.findOneByPublicIdWithFixtures.mockResolvedValue(loaded(next));
      await service.reload(PROJECT_ID);
      await settle();
    };
    const output = () => universe.getFrame()[CHANNEL];
    return { playback, click, press, beat, play, save, settle, output, functions, service, projects };
  }

  it('GIVEN an enabled beat bar WHEN beats arrive THEN the sequence is dark first and advances per beat', async () => {
    const { click, beat, output, playback } = await rig([beatControl('beat')]);

    await click('beat');
    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    expect(output()).toBe(0);

    beat();
    expect(output()).toBe(FIRST_STEP);
    beat();
    expect(output()).toBe(SECOND_STEP);
  });

  it('GIVEN an enabled beat bar WHEN its threshold changes on save THEN it re-arms dark and still follows beats', async () => {
    const { click, beat, save, output } = await rig([beatControl('beat')]);
    await click('beat');
    beat();

    await save([beatControl('beat', 30)]);
    expect(output()).toBe(0);

    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN two quick saves during a pending start WHEN settled THEN one armed runner follows beats', async () => {
    const { click, beat, service, projects, settle, output, playback } = await rig([beatControl('beat')]);
    await click('beat');
    projects.findOneByPublicIdWithFixtures.mockResolvedValue(loaded([beatControl('beat', 30)]));
    const first = service.reload(PROJECT_ID);
    projects.findOneByPublicIdWithFixtures.mockResolvedValue(loaded([beatControl('beat', 40)]));
    const second = service.reload(PROJECT_ID);
    await Promise.all([first, second]);
    await settle();

    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN an armed function WHEN a flash button is held THEN it runs free and ignores beats until released', async () => {
    const { click, press, beat, output, playback } = await rig([beatControl('beat'), button('flash', 'flash')]);
    await click('beat');

    await press('flash', 1);
    expect(output()).toBe(FIRST_STEP);
    beat();
    expect(output()).toBe(FIRST_STEP);

    await press('flash', 0);
    expect(playback.runningIds()).toEqual([]);
    expect(output()).toBe(0);
  });

  it('GIVEN a button holding an armed function WHEN the control turns off THEN the button run is not stopped', async () => {
    const { click, press, output, playback } = await rig([beatControl('beat'), button('flash', 'flash')]);
    await click('beat');
    await press('flash', 1);

    await click('beat');

    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    expect(output()).toBe(FIRST_STEP);
  });

  it.each([
    ['a flash button', 'flash' as const],
    ['a toggle button', 'toggle' as const],
  ])('GIVEN %s stopped an armed function WHEN the control is toggled again THEN it is armed again', async (_, mode) => {
    const { click, beat, output, playback } = await rig([beatControl('beat'), button('other', mode)]);
    await click('beat');
    await click('other');
    expect(playback.runningIds()).toEqual([]);

    beat();
    expect(output()).toBe(0);

    await click('beat');
    await click('beat');
    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN a stale hold after a stop elsewhere WHEN a second beat control turns on THEN it arms the function', async () => {
    const { click, beat, output, playback } = await rig([beatControl('a'), beatControl('b'), button('flash', 'flash')]);
    await click('a');
    await click('flash');
    expect(playback.runningIds()).toEqual([]);

    await click('b');

    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    expect(output()).toBe(0);
    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN a stale beat hold WHEN a level bar goes loud THEN the function starts and follows beats', async () => {
    const { click, beat, play, output, playback } = await rig([
      beatControl('beat'),
      levelControl('level'),
      button('flash', 'flash'),
    ]);
    await click('beat');
    await click('flash');
    await click('level');

    await play(1);

    expect(playback.runningIds()).toEqual([FUNCTION_ID]);
    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN a finished single shot WHEN the control is toggled again THEN it plays from the start', async () => {
    const { click, beat, output, playback } = await rig([beatControl('beat')], SequenceRunOrder.SingleShot);
    await click('beat');
    beat();
    beat();
    await vi.advanceTimersByTimeAsync(1100);
    expect(playback.runningIds()).toEqual([]);

    beat();
    expect(playback.runningIds()).toEqual([]);

    await click('beat');
    await click('beat');
    beat();
    expect(output()).toBe(FIRST_STEP);
  });

  it('GIVEN a level bar already running it free WHEN it falls silent THEN the beat hold keeps it until turned off', async () => {
    const { click, beat, play, output, playback } = await rig([levelControl('level'), beatControl('beat')]);
    await click('level');
    await play(1);
    await click('beat');
    await vi.advanceTimersByTimeAsync(0);
    const before = output();

    beat();
    expect(output()).toBe(before);

    await play(0, 40);
    expect(playback.runningIds()).toEqual([FUNCTION_ID]);

    await click('beat');
    expect(playback.runningIds()).toEqual([]);
  });

  it('GIVEN a level bar joining an armed function WHEN the beat control turns off THEN the last holder stops it', async () => {
    const { click, beat, play, output, playback } = await rig([beatControl('beat'), levelControl('level')]);
    await click('beat');
    await click('level');
    await play(1);
    beat();
    expect(output()).toBe(FIRST_STEP);

    await click('beat');
    expect(playback.runningIds()).toEqual([FUNCTION_ID]);

    await play(0, 40);
    expect(playback.runningIds()).toEqual([]);
    expect(output()).toBe(0);
  });

  it('GIVEN a button running the function WHEN the beat bar is saved changed THEN the button run is untouched', async () => {
    const { click, beat, save, output } = await rig([beatControl('beat'), button('toggle', 'toggle')]);
    await click('toggle');
    await click('beat');
    await vi.advanceTimersByTimeAsync(1100);
    expect(output()).toBe(SECOND_STEP);

    await save([beatControl('beat', 30), button('toggle', 'toggle')]);
    beat();

    expect(output()).toBe(SECOND_STEP);
  });

  it('GIVEN two controls on one function WHEN one threshold changes on save THEN the steps carry on', async () => {
    const { click, beat, save, output } = await rig([beatControl('a'), beatControl('b')]);
    await click('a');
    await click('b');
    beat();

    await save([beatControl('a', 30), beatControl('b')]);
    expect(output()).toBe(FIRST_STEP);

    beat();
    expect(output()).toBe(SECOND_STEP);
  });

  it('GIVEN a disabled control WHEN its beat function changes on save THEN nothing starts', async () => {
    const { save, playback, functions } = await rig([beatControl('beat')]);

    await save([beatControl('beat', 30)]);

    expect(playback.runningIds()).toEqual([]);
    expect(functions.findOneByPublicId).not.toHaveBeenCalled();
  });
});
