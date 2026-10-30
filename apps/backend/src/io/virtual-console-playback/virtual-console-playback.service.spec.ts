import { AppEventEmitter } from '@/events/app-event-emitter';
import type { DmxValue } from '@/io/dmx/types/dmx.types';
import type { VirtualConsoleControl } from '@/projects/virtual-console';
import { ProjectRepository } from '@/projects/repositories/project.repository';
import { EventEmitter2 } from 'eventemitter2';
import { describe, expect, it, vi } from 'vitest';
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
  const midiInput = (entryPublicId: string, value: number) => {
    eventEmitter.emit('virtualConsole.midiInput', { entryPublicId, value });
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
