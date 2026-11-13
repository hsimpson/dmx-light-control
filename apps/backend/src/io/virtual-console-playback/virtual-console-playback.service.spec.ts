import { AppEventEmitter } from '@/events/app-event-emitter';
import type { DmxValue } from '@/io/dmx/types/dmx.types';
import type { VirtualConsoleControl } from '@/projects/virtual-console';
import { ProjectRepository } from '@/projects/repositories/project.repository';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VirtualConsoleFeedback } from './virtual-console-events';
import { VirtualConsolePlaybackService } from './virtual-console-playback.service';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const FIXTURE_ID = '55555555-5555-4555-8555-555555555555';
const RED_ID = '66666666-6666-4666-8666-666666666666';
const FUNCTION_ID = '99999999-9999-4999-8999-999999999999';

const red = [{ projectFixturePublicId: FIXTURE_ID, channelAssignmentPublicId: RED_ID }];

const control = (id: string, type: VirtualConsoleControl['type'], overrides: Partial<VirtualConsoleControl> = {}) => ({
  id,
  type,
  x: 0,
  y: 0,
  width: 80,
  height: 80,
  label: id,
  backgroundColor: '#000000',
  ...overrides,
});

const slider = control('slider', 'slider', { channelBindings: red, valueType: 'percentage' });
const flash = control('flash', 'button', { channelBindings: red, buttonMode: 'flash', upperLimit: 200 });
const toggle = control('toggle', 'button', { channelBindings: red, buttonMode: 'toggle' });
const functionFlash = control('fn-flash', 'button', { functionPublicId: FUNCTION_ID, buttonMode: 'flash' });
const functionToggle = control('fn-toggle', 'button', { functionPublicId: FUNCTION_ID, buttonMode: 'toggle' });
const frame = control('frame', 'frame', { children: [slider, flash, toggle, functionFlash, functionToggle] });

const loadedProject = (controls: VirtualConsoleControl[]) => ({
  publicId: PROJECT_ID,
  virtualConsole: { schemaVersion: 1, width: 1280, height: 720, pages: [{ id: 'page', name: 'Page 1', controls }] },
  projectFixtures: [
    {
      publicId: FIXTURE_ID,
      startAddress: 10,
      fixtureChannelMode: { fixtureChannelAssignments: [{ publicId: RED_ID, channelNumber: 1 }] },
    },
  ],
});

async function build(controls: VirtualConsoleControl[] = [frame]) {
  const projects = { findOneByPublicIdWithFixtures: vi.fn().mockResolvedValue(loadedProject(controls)) };
  const eventEmitter = new AppEventEmitter(new EventEmitter2());
  const dmx: DmxValue[][] = [];
  const states: Record<string, number>[] = [];
  const functions: string[] = [];
  const feedback: VirtualConsoleFeedback[][] = [];
  eventEmitter.on('virtualConsole.feedback', ({ entries }) => {
    feedback.push(entries);
  });
  eventEmitter.on('dmx.manualValues', values => {
    dmx.push(values);
  });
  eventEmitter.on('virtualConsole.state', ({ values }) => {
    states.push(values);
  });
  eventEmitter.on('function.start', ({ functionPublicId }) => {
    functions.push(`start ${functionPublicId}`);
  });
  eventEmitter.on('function.stop', ({ functionPublicId }) => {
    functions.push(`stop ${functionPublicId}`);
  });
  const service = new VirtualConsolePlaybackService(projects as unknown as ProjectRepository, eventEmitter);
  service.onModuleInit();
  await service.reload(PROJECT_ID);
  const input = (controlId: string, value: number) => {
    eventEmitter.emit('virtualConsole.input', { controlId, value });
  };
  const midiInput = (entryPublicId: string, value: number, deviceSerial: string | null = null) => {
    eventEmitter.emit('virtualConsole.midiInput', { entryPublicId, value, deviceSerial });
  };
  return { service, projects, eventEmitter, dmx, states, functions, feedback, input, midiInput };
}

describe('VirtualConsolePlaybackService', () => {
  it('GIVEN a slider inside a frame WHEN moved THEN writes its scaled level and publishes its value', async () => {
    const { dmx, states, input } = await build();

    input('slider', 50);

    expect(dmx).toEqual([[{ channel: 10, value: 128 }]]);
    expect(states.at(-1)).toEqual({ slider: 50 });
  });

  it('GIVEN a slider WHEN the value is out of range THEN it is clamped to the control limits', async () => {
    const { dmx, states, input } = await build();

    input('slider', 250);

    expect(dmx).toEqual([[{ channel: 10, value: 255 }]]);
    expect(states.at(-1)).toEqual({ slider: 100 });
  });

  it('GIVEN a flash button WHEN pressed and released THEN it is on only while held', async () => {
    const { dmx, states, input } = await build();

    input('flash', 1);
    const whilePressed = states.at(-1);
    input('flash', 0);

    expect(dmx).toEqual([[{ channel: 10, value: 200 }], [{ channel: 10, value: 0 }]]);
    expect(whilePressed).toEqual({ flash: 200 });
    expect(states.at(-1)).toEqual({ flash: 0 });
  });

  it('GIVEN a toggle button WHEN pressed twice THEN it latches on and off and ignores releases', async () => {
    const { dmx, input } = await build();

    input('toggle', 1);
    input('toggle', 0);
    input('toggle', 1);

    expect(dmx).toEqual([[{ channel: 10, value: 255 }], [{ channel: 10, value: 0 }]]);
  });

  it('GIVEN a function flash button WHEN pressed and released THEN starts and stops the function', async () => {
    const { functions, input } = await build();

    input('fn-flash', 1);
    input('fn-flash', 0);

    expect(functions).toEqual([`start ${FUNCTION_ID}`, `stop ${FUNCTION_ID}`]);
  });

  it('GIVEN a function toggle button WHEN pressed THEN starts it, or stops it while it runs', async () => {
    const { eventEmitter, functions, input } = await build();

    input('fn-toggle', 1);
    eventEmitter.emit('function.state', { running: [FUNCTION_ID] });
    input('fn-toggle', 0);
    input('fn-toggle', 1);

    expect(functions).toEqual([`start ${FUNCTION_ID}`, `stop ${FUNCTION_ID}`]);
  });

  it('GIVEN unknown or frame ids WHEN input arrives THEN it is ignored', async () => {
    const { dmx, states, input } = await build();

    input('frame', 1);
    input('nope', 1);

    expect(dmx).toEqual([]);
    expect(states).toEqual([{}]);
  });

  it('GIVEN held controls WHEN the same project reloads without one THEN only the removed control is released', async () => {
    const { projects, eventEmitter, dmx, states, input } = await build([slider, flash]);
    input('slider', 20);
    input('flash', 1);
    projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([slider]));
    dmx.length = 0;

    eventEmitter.emit('project.virtualConsoleUpdated', { projectPublicId: PROJECT_ID });

    await vi.waitFor(() => {
      expect(states.at(-1)).toEqual({ slider: 20 });
    });
    expect(dmx).toEqual([[{ channel: 10, value: 51 }]]);
  });

  it('GIVEN held controls WHEN another project or none becomes active THEN everything is released', async () => {
    const { service, projects, dmx, states, input } = await build([slider]);
    input('slider', 100);
    projects.findOneByPublicIdWithFixtures.mockResolvedValue({ ...loadedProject([]), publicId: OTHER_PROJECT_ID });
    dmx.length = 0;

    await service.reload(OTHER_PROJECT_ID);
    input('slider', 50);
    await service.reload(null);

    expect(dmx).toEqual([[{ channel: 10, value: 0 }]]);
    expect(states.at(-1)).toEqual({});
  });

  it('GIVEN sliders with a lower limit WHEN the project loads THEN they output and publish their lowest level', async () => {
    const dmxSlider = control('strobe', 'slider', { channelBindings: red, valueType: 'dmx', lowerLimit: 63 });
    const percentSlider = control('dimmer', 'slider', {
      channelBindings: red,
      valueType: 'percentage',
      lowerLimit: 40,
    });

    const { dmx, states } = await build([dmxSlider, percentSlider, slider]);

    expect(dmx).toEqual([[{ channel: 10, value: 63 }], [{ channel: 10, value: 40 }]]);
    expect(states.at(-1)).toEqual({ strobe: 63, dimmer: 0 });
  });

  it('GIVEN a percentage slider at its lower limit WHEN another project loads THEN its channel is released', async () => {
    const percentSlider = control('dimmer', 'slider', {
      channelBindings: red,
      valueType: 'percentage',
      lowerLimit: 40,
    });
    const { service, projects, dmx } = await build([percentSlider]);
    projects.findOneByPublicIdWithFixtures.mockResolvedValue({ ...loadedProject([]), publicId: OTHER_PROJECT_ID });
    dmx.length = 0;

    await service.reload(OTHER_PROJECT_ID);

    expect(dmx).toEqual([[{ channel: 10, value: 0 }]]);
  });

  it('GIVEN a project without a saved console WHEN loaded THEN no control reacts', async () => {
    const { service, projects, dmx, input } = await build();
    projects.findOneByPublicIdWithFixtures.mockResolvedValue({ ...loadedProject([]), virtualConsole: null });

    await service.reload(PROJECT_ID);
    input('slider', 50);

    expect(dmx).toEqual([]);
  });

  it('GIVEN a disconnected client WHEN its held controls are released THEN flash buttons go off and sliders keep their level', async () => {
    const { eventEmitter, dmx, functions, states, input } = await build();
    input('slider', 50);
    input('flash', 1);
    input('toggle', 1);
    input('fn-flash', 1);

    eventEmitter.emit('virtualConsole.inputsReleased', { controlIds: ['slider', 'flash', 'toggle', 'fn-flash'] });

    expect(states.at(-1)).toEqual({ slider: 50, flash: 0, toggle: 255 });
    expect(dmx.at(-1)).toEqual([{ channel: 10, value: 255 }]);
    expect(functions).toEqual([`start ${FUNCTION_ID}`, `stop ${FUNCTION_ID}`]);
  });

  it('GIVEN a new client WHEN it asks for the state THEN the current values are published', async () => {
    const { eventEmitter, states, input } = await build();
    input('slider', 30);

    eventEmitter.emit('virtualConsole.state.request');

    expect(states.slice(-2)).toEqual([{ slider: 30 }, { slider: 30 }]);
  });

  describe('MIDI input and LED feedback', () => {
    const PAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const FADER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const override = { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 21 } };
    const midiSlider = {
      ...slider,
      midiEntryPublicId: FADER,
      valueType: 'dmx' as const,
      lowerLimit: 10,
      upperLimit: 137,
    };
    const midiFlash = { ...flash, midiEntryPublicId: PAD, feedback: override };
    const midiFunction = { ...functionToggle, midiEntryPublicId: PAD };

    it('GIVEN a fader bound to a slider WHEN CC values arrive THEN they are scaled onto the slider range', async () => {
      const { states, midiInput } = await build([midiSlider]);

      midiInput(FADER, 127);
      const top = states.at(-1);
      midiInput(FADER, 0);

      expect(top).toEqual({ slider: 137 });
      expect(states.at(-1)).toEqual({ slider: 10 });
    });

    it('GIVEN a pad bound to a flash button WHEN Note-On and Note-Off arrive THEN it reports on, then off, with its override', async () => {
      const { states, feedback, midiInput } = await build([midiFlash]);

      midiInput(PAD, 127);
      const pressed = feedback.at(-1);
      midiInput(PAD, 0);

      expect(pressed).toEqual([{ entryPublicId: PAD, state: 'on', feedback: override }]);
      expect(feedback.at(-1)).toEqual([{ entryPublicId: PAD, state: 'off', feedback: override }]);
      expect(states.at(-1)).toEqual({ flash: 0 });
    });

    it('GIVEN an entry nothing is bound to WHEN it is played THEN nothing happens', async () => {
      const { states, midiInput } = await build([midiSlider]);
      const before = states.length;

      midiInput('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 127);

      expect(states).toHaveLength(before);
    });

    describe('device scope', () => {
      const UPLIGHTS = '25082560709810';
      const T_BARS = '26062560878750';
      const onUplights = { ...midiFlash, midiDeviceSerials: [UPLIGHTS] };

      it('GIVEN a control scoped to one unit WHEN the other unit plays the entry THEN nothing happens', async () => {
        const { states, midiInput } = await build([onUplights]);
        const before = states.length;

        midiInput(PAD, 127, T_BARS);

        expect(states).toHaveLength(before);
      });

      it('GIVEN a control scoped to one unit WHEN that unit plays the entry THEN it reacts', async () => {
        const { states, midiInput } = await build([onUplights]);

        midiInput(PAD, 127, UPLIGHTS);

        expect(states.at(-1)?.flash).toBeGreaterThan(0);
      });

      it('GIVEN a control without a scope WHEN either unit plays the entry THEN it reacts', async () => {
        const { states, midiInput } = await build([midiFlash]);

        midiInput(PAD, 127, T_BARS);
        const fromTBars = states.at(-1)?.flash;
        midiInput(PAD, 0, T_BARS);
        midiInput(PAD, 127, UPLIGHTS);

        expect(fromTBars).toBeGreaterThan(0);
        expect(states.at(-1)?.flash).toBeGreaterThan(0);
      });

      it('GIVEN two controls on one entry scoped to different units WHEN one unit plays THEN only its control reacts', async () => {
        const onTBars = { ...midiFlash, id: 'flash-t-bars', midiDeviceSerials: [T_BARS] };
        const { states, midiInput } = await build([onUplights, onTBars]);

        midiInput(PAD, 127, T_BARS);

        expect(states.at(-1)?.['flash-t-bars']).toBeGreaterThan(0);
        expect(states.at(-1)?.flash ?? 0).toBe(0);
      });

      it('GIVEN a scoped control WHEN feedback is emitted THEN it carries the scope', async () => {
        const { feedback } = await build([onUplights]);

        expect(feedback.at(-1)).toEqual([
          { entryPublicId: PAD, state: 'off', feedback: override, deviceSerials: [UPLIGHTS] },
        ]);
      });
    });

    it('GIVEN a function button WHEN its function runs from it or from elsewhere THEN the LED shows on or monitor', async () => {
      const { eventEmitter, feedback, midiInput } = await build([midiFunction]);

      eventEmitter.emit('function.state', { running: [FUNCTION_ID] });
      const startedElsewhere = feedback.at(-1);
      eventEmitter.emit('function.state', { running: [] });
      midiInput(PAD, 127);
      eventEmitter.emit('function.state', { running: [FUNCTION_ID] });

      expect(startedElsewhere).toEqual([{ entryPublicId: PAD, state: 'monitor', feedback: null }]);
      expect(feedback.at(-1)).toEqual([{ entryPublicId: PAD, state: 'on', feedback: null }]);
    });

    it('GIVEN a button that started a function WHEN it is removed from the console THEN the function stops', async () => {
      const { service, eventEmitter, functions, projects, input } = await build([midiFunction]);
      input('fn-toggle', 1);
      eventEmitter.emit('function.state', { running: [FUNCTION_ID] });
      projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([]));

      await service.reload(PROJECT_ID);

      expect(functions).toEqual([`start ${FUNCTION_ID}`, `stop ${FUNCTION_ID}`]);
    });
  });
});

describe('VirtualConsolePlaybackService audio triggers', () => {
  const OTHER_FUNCTION_ID = '88888888-8888-4888-8888-888888888888';
  const audio = control('audio', 'audioTriggers', {
    bandCount: 1,
    audioBars: [
      { mode: 'channels', minThreshold: 20, maxThreshold: 80, channelBindings: red },
      { mode: 'none', minThreshold: 20, maxThreshold: 80 },
    ],
  });
  const audioFunction = control('audio-fn', 'audioTriggers', {
    bandCount: 1,
    audioBars: [
      { mode: 'function', minThreshold: 20, maxThreshold: 80, functionPublicId: OTHER_FUNCTION_ID },
      { mode: 'none', minThreshold: 20, maxThreshold: 80 },
    ],
  });

  // Mean square whose volume level reads `level` (0..1 over -60..0 dB).
  const frameAt = (level: number) => ({
    power: [],
    sampleRate: 48000,
    meanSquare: level === 0 ? 0 : 10 ** ((level * 60 - 60) / 10) / 2,
  });

  /** Plays `count` frames 50 ms apart, long enough for the smoothing to settle. */
  const play = (eventEmitter: AppEventEmitter, level: number, count = 20) => {
    for (let step = 0; step < count; step++) {
      vi.setSystemTime(Date.now() + 50);
      eventEmitter.emit('soundInput.spectrum', frameAt(level));
    }
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  async function buildAudio(controls: VirtualConsoleControl[]) {
    vi.useFakeTimers();
    const built = await build(controls);
    const levels: Record<string, number[]>[] = [];
    built.eventEmitter.on('virtualConsole.audioLevels', payload => {
      levels.push(payload.levels);
    });
    return { ...built, levels };
  }

  it('GIVEN a loaded audio control WHEN sound plays THEN nothing happens until it is enabled', async () => {
    const { eventEmitter, dmx, levels } = await buildAudio([audio]);

    play(eventEmitter, 1);

    expect(dmx).toEqual([]);
    expect(levels).toEqual([]);
  });

  it('GIVEN an enabled channels bar WHEN loud sound plays THEN its channel goes full and levels are published', async () => {
    const { eventEmitter, dmx, states, levels, input } = await buildAudio([audio]);

    input('audio', 1);
    play(eventEmitter, 1);

    expect(states.at(-1)).toEqual({ audio: 255 });
    expect(dmx.at(-1)).toEqual([{ channel: 10, value: 255 }]);
    expect(levels.at(-1)?.audio?.[0]).toBeCloseTo(1, 2);
  });

  it('GIVEN an enabled channels bar WHEN it is disabled THEN its channel goes dark and levels stop', async () => {
    const { eventEmitter, dmx, states, levels, input } = await buildAudio([audio]);
    input('audio', 1);
    play(eventEmitter, 1);

    input('audio', 0);
    input('audio', 1);
    const published = levels.length;
    play(eventEmitter, 1, 3);

    expect(states.at(-1)).toEqual({ audio: 0 });
    expect(dmx.at(-1)).toEqual([{ channel: 10, value: 0 }]);
    expect(levels).toHaveLength(published);
  });

  it('GIVEN a slider holding a channel WHEN an audio bar on it falls silent THEN the slider level stays (HTP)', async () => {
    const { eventEmitter, dmx, input } = await buildAudio([slider, audio]);
    input('slider', 50);
    input('audio', 1);
    play(eventEmitter, 1);

    play(eventEmitter, 0, 40);

    expect(dmx.at(-1)).toEqual([{ channel: 10, value: 128 }]);
  });

  it('GIVEN a function bar WHEN the level crosses max, wobbles and drops below min THEN it starts and stops once', async () => {
    const { eventEmitter, functions, input } = await buildAudio([audioFunction]);
    input('audio-fn', 1);

    play(eventEmitter, 1);
    play(eventEmitter, 0.5);
    play(eventEmitter, 0, 40);

    expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
  });

  it('GIVEN a running bar function WHEN the control is removed from the console THEN the function stops', async () => {
    const { eventEmitter, functions, input, projects, service } = await buildAudio([audioFunction]);
    input('audio-fn', 1);
    play(eventEmitter, 1);

    projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([]));
    await service.reload(PROJECT_ID);

    expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
  });

  it('GIVEN a function already running elsewhere WHEN a bar crosses max THEN it neither restarts nor stops it', async () => {
    const { eventEmitter, functions, input } = await buildAudio([audioFunction]);
    eventEmitter.emit('function.state', { running: [OTHER_FUNCTION_ID] });
    input('audio-fn', 1);

    play(eventEmitter, 1);
    play(eventEmitter, 0, 40);

    expect(functions).toEqual([]);
  });

  it('GIVEN a bar start still pending WHEN a stale function state arrives THEN the bar can still stop it', async () => {
    const { eventEmitter, functions, input } = await buildAudio([audioFunction]);
    input('audio-fn', 1);
    play(eventEmitter, 1);

    eventEmitter.emit('function.state', { running: [] });
    play(eventEmitter, 0, 40);

    expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
  });

  it('GIVEN two audio controls on one function WHEN one is disabled THEN it runs until the other lets go', async () => {
    const twin = { ...audioFunction, id: 'audio-fn-2' };
    const { eventEmitter, functions, input } = await buildAudio([audioFunction, twin]);
    input('audio-fn', 1);
    input('audio-fn-2', 1);
    play(eventEmitter, 1);
    eventEmitter.emit('function.state', { running: [OTHER_FUNCTION_ID] });

    input('audio-fn', 0);
    input('audio-fn', 1);
    const afterFirstDisabled = [...functions];
    input('audio-fn-2', 0);
    input('audio-fn-2', 1);

    expect(afterFirstDisabled).toEqual([`start ${OTHER_FUNCTION_ID}`]);
    expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
  });

  it('GIVEN an enabled control WHEN the console is saved with the same bars THEN its output does not blink', async () => {
    const { eventEmitter, dmx, input, service } = await buildAudio([audio]);
    input('audio', 1);
    play(eventEmitter, 1);
    const written = dmx.length;

    await service.reload(PROJECT_ID);

    expect(dmx).toHaveLength(written);
  });

  it('GIVEN an enabled control WHEN its bars change on save THEN the old channels are released', async () => {
    const { eventEmitter, dmx, input, projects, service } = await buildAudio([audio]);
    input('audio', 1);
    play(eventEmitter, 1);

    projects.findOneByPublicIdWithFixtures.mockResolvedValue(
      loadedProject([
        {
          ...audio,
          audioBars: [
            { mode: 'none', minThreshold: 20, maxThreshold: 80 },
            { mode: 'none', minThreshold: 20, maxThreshold: 80 },
          ],
        },
      ]),
    );
    await service.reload(PROJECT_ID);

    expect(dmx.at(-1)).toEqual([{ channel: 10, value: 0 }]);
  });

  describe('beat bar', () => {
    const idleBars = [
      { mode: 'none', minThreshold: 20, maxThreshold: 80 },
      { mode: 'none', minThreshold: 20, maxThreshold: 80 },
    ] as const;
    const beatControl = (id = 'beat', minThreshold = 20) =>
      control(id, 'audioTriggers', {
        bandCount: 1,
        audioBars: [...idleBars],
        beatBar: { minThreshold, functionPublicId: OTHER_FUNCTION_ID },
      });

    async function buildBeat(controls: VirtualConsoleControl[]) {
      const built = await buildAudio(controls);
      const starts: { functionPublicId: string; stepped?: boolean }[] = [];
      const steps: string[] = [];
      built.eventEmitter.on('function.start', payload => {
        starts.push(payload);
      });
      built.eventEmitter.on('function.step', ({ functionPublicId }) => {
        steps.push(functionPublicId);
      });
      const beat = (level = 0.8) => {
        built.eventEmitter.emit('soundInput.beat', { level });
      };
      return { ...built, starts, steps, beat };
    }

    it('GIVEN a disabled control WHEN a beat arrives THEN nothing starts or steps', async () => {
      const { starts, steps, beat } = await buildBeat([beatControl()]);

      beat();

      expect(starts).toEqual([]);
      expect(steps).toEqual([]);
    });

    it('GIVEN an enabled control WHEN beats arrive THEN the function is armed stepped and steps once per beat', async () => {
      const { starts, steps, beat, input } = await buildBeat([beatControl()]);

      input('beat', 1);
      expect(starts).toEqual([{ functionPublicId: OTHER_FUNCTION_ID, stepped: true }]);
      expect(steps).toEqual([]);

      beat();
      beat();

      expect(steps).toEqual([OTHER_FUNCTION_ID, OTHER_FUNCTION_ID]);
      expect(starts).toHaveLength(1);
    });

    it.each([
      ['below', 0.39, 0],
      ['exactly at', 0.4, 1],
      ['above', 0.41, 1],
    ])('GIVEN a 40 %% threshold WHEN a beat is %s it THEN it counts accordingly', async (_case, level, count) => {
      const { steps, beat, input } = await buildBeat([beatControl('beat', 40)]);
      input('beat', 1);

      beat(level);

      expect(steps).toHaveLength(count);
    });

    it('GIVEN two controls on one function WHEN a beat arrives THEN it starts once and steps once', async () => {
      const { starts, steps, beat, input } = await buildBeat([beatControl('a'), beatControl('b')]);
      input('a', 1);
      input('b', 1);

      beat();

      expect(starts).toHaveLength(1);
      expect(steps).toEqual([OTHER_FUNCTION_ID]);
    });

    it('GIVEN two controls with different timing on one function WHEN beats arrive THEN the first enabled one decides', async () => {
      const timed = (id: string, hold: number) =>
        control(id, 'audioTriggers', {
          bandCount: 1,
          audioBars: [...idleBars],
          beatBar: { minThreshold: 20, functionPublicId: OTHER_FUNCTION_ID, timing: { fadeIn: 0, hold, fadeOut: 0 } },
        });
      const { eventEmitter, beat, input } = await buildBeat([timed('a', 40), timed('b', 80)]);
      const timings: unknown[] = [];
      eventEmitter.on('function.step', ({ timing }) => {
        timings.push(timing);
      });
      input('b', 1);
      input('a', 1);

      beat();
      vi.advanceTimersByTime(500);
      beat();

      expect(timings).toEqual([undefined, { fadeIn: 0, hold: 400, fadeOut: 0 }]);
    });

    describe('tempo', () => {
      async function buildTempo() {
        const built = await buildBeat([beatControl()]);
        const bpm: Record<string, number>[] = [];
        built.eventEmitter.on('virtualConsole.audioLevels', payload => {
          bpm.push(payload.bpm);
        });
        built.input('beat', 1);
        return { ...built, bpm };
      }

      it('GIVEN beats every 500 ms WHEN levels are published THEN the control reports 120 BPM', async () => {
        const { eventEmitter, beat, bpm } = await buildTempo();

        beat();
        play(eventEmitter, 0.5, 10);
        beat();
        play(eventEmitter, 0.5, 1);

        expect(bpm.at(-1)).toEqual({ beat: 120 });
      });

      it('GIVEN only a first beat WHEN levels are published THEN no tempo is reported', async () => {
        const { eventEmitter, beat, bpm } = await buildTempo();

        beat();
        play(eventEmitter, 0.5, 2);

        expect(bpm.at(-1)).toEqual({});
      });

      it('GIVEN a known tempo WHEN no beat comes for more than 2 s THEN the tempo is no longer reported', async () => {
        const { eventEmitter, beat, bpm } = await buildTempo();
        beat();
        play(eventEmitter, 0.5, 10);
        beat();

        play(eventEmitter, 0.5, 41);

        expect(bpm.at(-1)).toEqual({});
      });

      it('GIVEN a known tempo WHEN the next beat comes after a break THEN the tempo is dropped at once', async () => {
        const { eventEmitter, beat, bpm } = await buildTempo();
        beat();
        play(eventEmitter, 0.5, 10);
        beat();
        vi.setSystemTime(Date.now() + 2500);

        beat();
        play(eventEmitter, 0.5, 1);

        expect(bpm.at(-1)).toEqual({});
      });

      it('GIVEN a known tempo WHEN the control is turned off and on THEN the tempo is measured again', async () => {
        const { eventEmitter, beat, bpm, input } = await buildTempo();
        beat();
        play(eventEmitter, 0.5, 10);
        beat();
        input('beat', 0);
        input('beat', 1);
        input('beat', 0);
        input('beat', 1);

        beat();
        play(eventEmitter, 0.5, 1);

        expect(bpm.at(-1)).toEqual({});
      });
    });

    it('GIVEN two controls on one function WHEN only one is turned off THEN the function keeps running', async () => {
      const { functions, input } = await buildBeat([beatControl('a'), beatControl('b')]);
      input('a', 1);
      input('b', 1);

      input('a', 0);
      input('a', 1);
      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`]);

      input('b', 0);
      input('b', 1);
      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN a function already running elsewhere WHEN the control is toggled on and off THEN it is left alone', async () => {
      const { eventEmitter, functions, input } = await buildBeat([beatControl()]);
      eventEmitter.emit('function.state', { running: [OTHER_FUNCTION_ID] });

      input('beat', 1);
      input('beat', 0);
      input('beat', 1);

      expect(functions).toEqual([]);
    });

    it('GIVEN an armed function WHEN the control is turned off THEN it stops and beats stop stepping', async () => {
      const { functions, steps, beat, input } = await buildBeat([beatControl()]);
      input('beat', 1);

      input('beat', 0);
      input('beat', 1);
      beat();

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
      expect(steps).toEqual([]);
    });

    it('GIVEN a function the control started WHEN it is turned on again THEN it is armed again', async () => {
      const { functions, input } = await buildBeat([beatControl()]);
      input('beat', 1);
      input('beat', 0);
      input('beat', 1);
      input('beat', 0);

      input('beat', 1);

      expect(functions.filter(entry => entry.startsWith('start'))).toHaveLength(2);
    });

    it('GIVEN an armed function WHEN the control is removed from the console THEN the function stops', async () => {
      const { functions, input, projects, service } = await buildBeat([beatControl()]);
      input('beat', 1);

      projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([]));
      await service.reload(PROJECT_ID);

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN an armed function WHEN the project changes THEN the function stops', async () => {
      const { functions, input, projects, service } = await buildBeat([beatControl()]);
      input('beat', 1);

      projects.findOneByPublicIdWithFixtures.mockResolvedValue(undefined);
      await service.reload(OTHER_PROJECT_ID);

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN an enabled control WHEN saved unchanged THEN the function is not restarted', async () => {
      const { functions, input, service } = await buildBeat([beatControl()]);
      input('beat', 1);

      await service.reload(PROJECT_ID);

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN an enabled control WHEN its beat function changes THEN the old stops and the new is armed', async () => {
      const { functions, starts, states, input, projects, service } = await buildBeat([beatControl()]);
      input('beat', 1);
      const changed = {
        ...beatControl(),
        beatBar: { minThreshold: 20, functionPublicId: FUNCTION_ID },
      };

      projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([changed]));
      await service.reload(PROJECT_ID);

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`, `start ${FUNCTION_ID}`]);
      expect(starts.at(-1)).toEqual({ functionPublicId: FUNCTION_ID, stepped: true });
      expect(states.at(-1)).toEqual({ beat: 255 });
    });

    it('GIVEN an enabled control WHEN its beat function is removed THEN it stops and nothing else is armed', async () => {
      const { functions, steps, beat, input, projects, service } = await buildBeat([beatControl()]);
      input('beat', 1);
      const changed = { ...beatControl(), beatBar: { minThreshold: 20 } };

      projects.findOneByPublicIdWithFixtures.mockResolvedValue(loadedProject([changed]));
      await service.reload(PROJECT_ID);
      beat();

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
      expect(steps).toEqual([]);
    });

    it('GIVEN a level bar on the same function WHEN it falls silent THEN the beat bar keeps it armed', async () => {
      const shared = control('shared', 'audioTriggers', {
        bandCount: 1,
        audioBars: [
          { mode: 'function', minThreshold: 20, maxThreshold: 80, functionPublicId: OTHER_FUNCTION_ID },
          { mode: 'none', minThreshold: 20, maxThreshold: 80 },
        ],
        beatBar: { minThreshold: 20, functionPublicId: OTHER_FUNCTION_ID },
      });
      const { eventEmitter, functions, input } = await buildBeat([shared]);
      input('shared', 1);

      play(eventEmitter, 1);
      play(eventEmitter, 0, 40);
      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`]);

      input('shared', 0);
      input('shared', 1);
      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`, `stop ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN an armed function stopped elsewhere WHEN the control turns off THEN it is not stopped twice', async () => {
      const { eventEmitter, functions, input } = await buildBeat([beatControl()]);
      input('beat', 1);
      eventEmitter.emit('function.state', { running: [OTHER_FUNCTION_ID] });
      eventEmitter.emit('function.state', { running: [] });

      input('beat', 0);
      input('beat', 1);

      expect(functions).toEqual([`start ${OTHER_FUNCTION_ID}`]);
    });

    it('GIVEN an enabled control WHEN a beat arrives THEN a pulse follows the bars and decays', async () => {
      const { eventEmitter, levels, beat, input } = await buildBeat([beatControl()]);
      input('beat', 1);
      play(eventEmitter, 0.5, 1);
      expect(levels.at(-1)?.beat).toHaveLength(3);
      expect(levels.at(-1)?.beat?.[2]).toBe(0);

      beat();
      play(eventEmitter, 0.5, 1);
      const pulse = levels.at(-1)?.beat?.[2] ?? 0;
      expect(pulse).toBeGreaterThan(0.7);
      expect(pulse).toBeLessThanOrEqual(1);

      play(eventEmitter, 0.5, 40);
      expect(levels.at(-1)?.beat?.[2]).toBe(0);
    });

    it('GIVEN a beat below the threshold WHEN it arrives THEN there is no pulse', async () => {
      const { eventEmitter, levels, beat, input } = await buildBeat([beatControl('beat', 50)]);
      input('beat', 1);

      beat(0.2);
      play(eventEmitter, 0.5, 1);

      expect(levels.at(-1)?.beat?.[2]).toBe(0);
    });

    it('GIVEN a control saved before beat bars existed WHEN a beat arrives THEN it pulses but steps nothing', async () => {
      const { eventEmitter, starts, steps, levels, beat, input } = await buildBeat([audio]);
      input('audio', 1);
      play(eventEmitter, 0.5, 1);

      beat();
      play(eventEmitter, 0.5, 1);

      expect(starts).toEqual([]);
      expect(steps).toEqual([]);
      expect(levels.at(-1)?.audio?.[2]).toBeGreaterThan(0.7);
    });
  });

  it('GIVEN an audio control on a MIDI knob WHEN the knob turns THEN it toggles once, on the rising edge', async () => {
    const { states, midiInput } = await buildAudio([{ ...audio, midiEntryPublicId: 'entry' }]);

    midiInput('entry', 10);
    midiInput('entry', 40);
    midiInput('entry', 90);

    expect(states.at(-1)).toEqual({ audio: 255 });
  });
});

describe('VirtualConsolePlaybackService global tap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const tap = control('tap', 'globalTap', {
    tapTiming: { fadeIn: 0, hold: 50, fadeOut: 50 },
    midiEntryPublicId: 'tap-pad',
  });

  async function buildTap(controls: VirtualConsoleControl[] = [tap]) {
    vi.useFakeTimers();
    const built = await build(controls);
    const taps: unknown[] = [];
    built.eventEmitter.on('function.tap', payload => {
      taps.push(payload);
    });
    return { ...built, taps };
  }

  it('GIVEN a first tap WHEN pressed THEN it taps without tempo and shows pressed until released', async () => {
    const { taps, states, input } = await buildTap();

    input('tap', 1);
    const whilePressed = states.at(-1);
    input('tap', 0);

    expect(taps).toEqual([{}]);
    expect(whilePressed).toEqual({ tap: 255 });
    expect(states.at(-1)).toEqual({ tap: 0 });
  });

  it('GIVEN a held tap WHEN the press repeats THEN only the rising edge taps', async () => {
    const { taps, input } = await buildTap();

    input('tap', 1);
    input('tap', 1);

    expect(taps).toHaveLength(1);
  });

  it('GIVEN steady taps WHEN the gap is known THEN the tap carries the tempo and timing in ms', async () => {
    const { taps, input } = await buildTap();

    input('tap', 1);
    input('tap', 0);
    vi.advanceTimersByTime(500);
    input('tap', 1);

    expect(taps.at(-1)).toEqual({ gapMs: 500, timing: { fadeIn: 0, hold: 250, fadeOut: 250 } });
  });

  it('GIVEN a tap without timing WHEN the gap is known THEN only the tempo is sent', async () => {
    const { taps, input } = await buildTap([control('tap', 'globalTap')]);

    input('tap', 1);
    input('tap', 0);
    vi.advanceTimersByTime(400);
    input('tap', 1);

    expect(taps.at(-1)).toEqual({ gapMs: 400 });
  });

  it('GIVEN two tap controls WHEN tapped in turn THEN they share one tempo', async () => {
    const { taps, input } = await buildTap([tap, control('tap-2', 'globalTap')]);

    input('tap', 1);
    vi.advanceTimersByTime(300);
    input('tap-2', 1);

    expect(taps.at(-1)).toEqual({ gapMs: 300 });
  });

  it('GIVEN a pad bound to the tap WHEN Note-On and Note-Off arrive THEN it taps once', async () => {
    const { taps, midiInput } = await buildTap();

    midiInput('tap-pad', 127);
    midiInput('tap-pad', 0);

    expect(taps).toHaveLength(1);
  });

  it('GIVEN a tap held while another project loads WHEN the project comes back THEN the next press taps', async () => {
    const { taps, input, service, projects } = await buildTap();
    input('tap', 1);
    projects.findOneByPublicIdWithFixtures.mockResolvedValueOnce(undefined);
    await service.reload(OTHER_PROJECT_ID);
    await service.reload(PROJECT_ID);

    input('tap', 1);

    expect(taps).toHaveLength(2);
  });

  it('GIVEN a held tap WHEN its client disconnects THEN it is released', async () => {
    const { states, input, eventEmitter } = await buildTap();
    input('tap', 1);

    eventEmitter.emit('virtualConsole.inputsReleased', { controlIds: ['tap'] });

    expect(states.at(-1)).toEqual({ tap: 0 });
  });
});
