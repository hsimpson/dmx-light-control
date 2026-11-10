import { AppEventEmitter } from '@/events/app-event-emitter';
import { IoDeviceManagerService } from '@/io/devices/io-device-manager.service';
import { IoDeviceKind, IoDeviceStatus } from '@/io/devices/match-io-devices';
import { MidiControlType, MidiMessageType } from '@/midi-mappings/midi-mapping';
import { MidiMappingRepository } from '@/midi-mappings/repositories/midi-mapping.repository';
import { EventEmitter2 } from 'eventemitter2';
import type { MidiMessage } from 'midi';
import { describe, expect, it, vi } from 'vitest';
import { IoBridgeService } from './io-bridge.service';

const MAPPING_ID = '11111111-1111-4111-8111-111111111111';
const PAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRACK = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FADER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const APC_PORT = 'APC mini mk2:APC mini mk2 Control 20:0';

const padDefault = { off: { behavior: 0, color: 0 }, on: { behavior: 6, color: 5 }, monitor: null };
const entry = (publicId: string, messageType: MidiMessageType, number: number, feedback: unknown = null) => ({
  publicId,
  name: publicId,
  controlType: messageType === MidiMessageType.Note ? MidiControlType.Button : MidiControlType.Slider,
  messageType,
  channel: 0,
  number,
  feedback,
});
const mapping = (entries: ReturnType<typeof entry>[]) => ({
  publicId: MAPPING_ID,
  name: 'APC',
  midiMappingEntries: entries,
});
const apcEntries = [
  entry(PAD, MidiMessageType.Note, 0, padDefault),
  entry(TRACK, MidiMessageType.Note, 0x64, { off: { behavior: 0, color: 0 }, on: { behavior: 0, color: 1 } }),
  entry(FADER, MidiMessageType.ControlChange, 48),
];

type Unit = { port: string; serial: string | null };
type FeedbackItem = {
  entryPublicId: string;
  state: 'off' | 'on' | 'monitor';
  feedback: unknown;
  deviceSerials?: string[];
};

function build(midiMappingPublicId: string | null = MAPPING_ID, units: Unit[] = [{ port: APC_PORT, serial: null }]) {
  const eventEmitter = new AppEventEmitter(new EventEmitter2());
  const devices = {
    statuses: () =>
      units.map(({ port, serial }) => ({
        device: {
          kind: IoDeviceKind.Midi,
          name: 'APC mini mk2',
          manufacturer: null,
          serial,
          vendorId: null,
          productId: null,
          usbLocation: null,
          midiMappingPublicId,
        },
        status: IoDeviceStatus.Connected,
        handle: port,
      })),
  };
  const mappings = { findOneWithEntries: vi.fn().mockResolvedValue(mapping(apcEntries)) };
  const inputs: { entryPublicId: string; value: number; deviceSerial: string | null }[] = [];
  const sent: number[][] = [];
  const sentByPort = new Map<string, number[][]>(units.map(({ port }) => [port, []]));
  eventEmitter.on('virtualConsole.midiInput', payload => {
    inputs.push(payload);
  });
  eventEmitter.on('midi.sendMessage', ({ portName, message }) => {
    sent.push(message);
    sentByPort.get(portName)?.push(message);
  });
  const service = new IoBridgeService(
    eventEmitter,
    devices as unknown as IoDeviceManagerService,
    mappings as unknown as MidiMappingRepository,
  );
  service.onModuleInit();
  const receive = async (message: MidiMessage, portName = APC_PORT) => {
    eventEmitter.emit('midi.inputMessage', { portName, message });
    await vi.waitFor(() => {
      expect(mappings.findOneWithEntries).toHaveBeenCalled();
    });
    await new Promise(resolve => setImmediate(resolve));
  };
  const feedback = async (entries: FeedbackItem[]) => {
    eventEmitter.emit('virtualConsole.feedback', { entries } as never);
    await new Promise(resolve => setImmediate(resolve));
  };
  return { eventEmitter, mappings, inputs, sent, sentByPort, receive, feedback };
}

describe('IoBridgeService', () => {
  it('GIVEN a controller with a mapping WHEN notes and CCs arrive THEN the matching entries are played', async () => {
    const { inputs, receive } = build();

    await receive([0x90, 0, 127]);
    await receive([0x80, 0, 64]);
    await receive([0x90, 0, 0]);
    await receive([0xb0, 48, 100]);

    expect(inputs).toEqual([
      { entryPublicId: PAD, value: 127, deviceSerial: null },
      { entryPublicId: PAD, value: 0, deviceSerial: null },
      { entryPublicId: PAD, value: 0, deviceSerial: null },
      { entryPublicId: FADER, value: 100, deviceSerial: null },
    ]);
  });

  it('GIVEN an address that is not mapped, another channel or another message WHEN it arrives THEN nothing is played', async () => {
    const { inputs, receive } = build();

    await receive([0x90, 99, 127]);
    await receive([0x91, 0, 127]);
    await receive([0xe0, 0, 64]);

    expect(inputs).toEqual([]);
  });

  it('GIVEN a controller without a mapping WHEN a note arrives THEN nothing is played', async () => {
    const { inputs, mappings, eventEmitter } = build(null);

    eventEmitter.emit('midi.inputMessage', { portName: APC_PORT, message: [0x90, 0, 127] });
    await new Promise(resolve => setImmediate(resolve));

    expect(inputs).toEqual([]);
    expect(mappings.findOneWithEntries).not.toHaveBeenCalled();
  });

  it('GIVEN LED states WHEN feedback arrives THEN Note LEDs are sent with override, default, monitor fallback and off for unbound', async () => {
    const { sent, feedback } = build();
    const override = { off: { behavior: 0, color: 3 }, on: { behavior: 0xb, color: 9 } };

    await feedback([
      { entryPublicId: PAD, state: 'monitor', feedback: null },
      { entryPublicId: TRACK, state: 'on', feedback: override },
      { entryPublicId: FADER, state: 'on', feedback: null },
    ]);

    expect(sent).toEqual([
      [0x96, 0, 5],
      [0x9b, 0x64, 9],
    ]);
  });

  it('GIVEN LEDs already sent WHEN the same state arrives THEN nothing is resent, until the controller reconnects', async () => {
    const { eventEmitter, sent, feedback } = build();
    await feedback([{ entryPublicId: PAD, state: 'on', feedback: null }]);
    sent.length = 0;

    await feedback([{ entryPublicId: PAD, state: 'on', feedback: null }]);
    const unchanged = [...sent];
    eventEmitter.emit('midi.outputOpened', { portName: APC_PORT });
    await new Promise(resolve => setImmediate(resolve));

    expect(unchanged).toEqual([]);
    expect(sent).toEqual([
      [0x96, 0, 5],
      [0x90, 0x64, 0],
    ]);
  });

  it('GIVEN a mapping edit WHEN the next note arrives THEN the mapping is reloaded', async () => {
    const { eventEmitter, mappings, inputs, receive } = build();
    await receive([0x90, 0, 127]);
    mappings.findOneWithEntries.mockResolvedValue(mapping([entry(PAD, MidiMessageType.Note, 7)]));

    eventEmitter.emit('midiMapping.changed');
    await receive([0x90, 7, 127]);

    expect(inputs).toEqual([
      { entryPublicId: PAD, value: 127, deviceSerial: null },
      { entryPublicId: PAD, value: 127, deviceSerial: null },
    ]);
    expect(mappings.findOneWithEntries).toHaveBeenCalledTimes(2);
  });

  describe('two units sharing one mapping', () => {
    const UPLIGHTS = { port: 'APC mini mk2:APC mini mk2 Control 28:0', serial: '25082560709810' };
    const T_BARS = { port: 'APC mini mk2:APC mini mk2 Control 32:0', serial: '26062560878750' };
    const PAD_ON = [0x96, 0, 5];
    const PAD_OFF = [0x90, 0, 0];
    const padItem = (state: 'off' | 'on', deviceSerials?: string[]): FeedbackItem => ({
      entryPublicId: PAD,
      state,
      feedback: null,
      deviceSerials,
    });
    const buildUnits = () => build(MAPPING_ID, [UPLIGHTS, T_BARS]);

    it('GIVEN a note from one unit WHEN it is played THEN the input carries that unit', async () => {
      const { inputs, receive } = buildUnits();

      await receive([0x90, 0, 127], T_BARS.port);

      expect(inputs).toEqual([{ entryPublicId: PAD, value: 127, deviceSerial: T_BARS.serial }]);
    });

    it('GIVEN feedback scoped to one unit WHEN it arrives THEN only that unit lights up', async () => {
      const { sentByPort, feedback } = buildUnits();

      await feedback([padItem('on', [UPLIGHTS.serial])]);

      expect(sentByPort.get(UPLIGHTS.port)).toContainEqual(PAD_ON);
      expect(sentByPort.get(T_BARS.port)).toContainEqual(PAD_OFF);
      expect(sentByPort.get(T_BARS.port)).not.toContainEqual(PAD_ON);
    });

    it('GIVEN one entry scoped differently per unit WHEN feedback arrives THEN each unit shows its own state', async () => {
      const { sentByPort, feedback } = buildUnits();

      await feedback([padItem('on', [T_BARS.serial]), padItem('off', [UPLIGHTS.serial])]);

      expect(sentByPort.get(T_BARS.port)).toContainEqual(PAD_ON);
      expect(sentByPort.get(UPLIGHTS.port)).toContainEqual(PAD_OFF);
    });

    it('GIVEN feedback without a scope WHEN it arrives THEN both units light up', async () => {
      const { sentByPort, feedback } = buildUnits();

      await feedback([padItem('on')]);

      expect(sentByPort.get(UPLIGHTS.port)).toContainEqual(PAD_ON);
      expect(sentByPort.get(T_BARS.port)).toContainEqual(PAD_ON);
    });

    it('GIVEN several items for one unit and entry WHEN feedback arrives THEN the last one wins for that unit', async () => {
      const { sentByPort, feedback } = buildUnits();

      await feedback([padItem('off'), padItem('on', [T_BARS.serial])]);

      expect(sentByPort.get(T_BARS.port)).toContainEqual(PAD_ON);
      expect(sentByPort.get(UPLIGHTS.port)).not.toContainEqual(PAD_ON);
    });

    it('GIVEN one unit changes WHEN feedback arrives again THEN the other unit gets nothing', async () => {
      const { sentByPort, feedback } = buildUnits();
      await feedback([padItem('on', [UPLIGHTS.serial])]);
      sentByPort.get(UPLIGHTS.port)?.splice(0);
      sentByPort.get(T_BARS.port)?.splice(0);

      await feedback([padItem('off', [UPLIGHTS.serial])]);

      expect(sentByPort.get(UPLIGHTS.port)).toEqual([PAD_OFF]);
      expect(sentByPort.get(T_BARS.port)).toEqual([]);
    });
  });
});
