import { AppEventEmitter } from '@/events/app-event-emitter';
import { EventEmitter2 } from 'eventemitter2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MidiService } from './midi.service';

const { fakeMidi } = vi.hoisted(() => {
  class Emitter {
    private handlers = new Map<string, ((...args: unknown[]) => void)[]>();
    public on(event: string, handler: (...args: unknown[]) => void): this {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }
    public emit(event: string, ...args: unknown[]): void {
      for (const handler of this.handlers.get(event) ?? []) handler(...args);
    }
    public removeAllListeners(): this {
      this.handlers.clear();
      return this;
    }
  }

  const state = {
    inputNames: [] as string[],
    outputNames: [] as string[],
    openFailure: null as Error | null,
    inputs: [] as FakeInput[],
    outputs: [] as FakeOutput[],
  };

  class FakeInput extends Emitter {
    public openedName: string | null = null;
    public openedIndex: number | null = null;
    public sysexEnabled = false;
    private closing = false;
    public constructor() {
      super();
      state.inputs.push(this);
    }
    public ignoreTypes(sysex: boolean): void {
      this.sysexEnabled = !sysex;
    }
    public getPortCount(): number {
      return state.inputNames.length;
    }
    public getPortName(index: number): string {
      return state.inputNames[index] ?? '';
    }
    public openPort(index: number): void {
      if (state.openFailure) throw state.openFailure;
      if (this.closing) throw new Error('libuv would abort: reopened before the close completed');
      this.openedName = state.inputNames[index] ?? null;
      this.openedIndex = index;
    }
    public closePort(): void {
      this.openedName = null;
      this.openedIndex = null;
      this.closing = true;
      setTimeout(() => {
        this.closing = false;
      }, 0);
    }
  }

  class FakeOutput {
    public openedName: string | null = null;
    public openedIndex: number | null = null;
    public readonly sent: number[][] = [];
    public constructor() {
      state.outputs.push(this);
    }
    public getPortCount(): number {
      return state.outputNames.length;
    }
    public getPortName(index: number): string {
      return state.outputNames[index] ?? '';
    }
    public openPort(index: number): void {
      this.openedName = state.outputNames[index] ?? null;
      this.openedIndex = index;
    }
    public closePort(): void {
      this.openedName = null;
      this.openedIndex = null;
    }
    public sendMessage(message: number[]): void {
      this.sent.push(message);
    }
  }

  return { fakeMidi: { state, FakeInput, FakeOutput } };
});

vi.mock('midi', () => ({ default: { Input: fakeMidi.FakeInput, Output: fakeMidi.FakeOutput } }));

const APC = 'APC mini mk2:APC mini mk2 Control 28:0';
// macOS (CoreMIDI) with two APC mini mk2: identical port names, and only the first unit names its output "Port 1".
const MAC_TWO_APC_INPUTS = ['APC mini mk2 Control', 'APC mini mk2 Notes', 'APC mini mk2 Control', 'APC mini mk2 Notes'];
const MAC_TWO_APC_OUTPUTS = ['APC mini mk2 Port 1', 'APC mini mk2 Notes', 'APC mini mk2 Control', 'APC mini mk2 Notes'];
const KEYS = 'Keys:Keys MIDI 1 32:0';

function openedInput(name: string) {
  return fakeMidi.state.inputs.find(input => input.openedName === name);
}

function openedOutput(name: string) {
  return fakeMidi.state.outputs.find(output => output.openedName === name);
}

describe('MidiService', () => {
  let eventEmitter: AppEventEmitter;
  let emitted: { event: string; payload: unknown }[];
  let service: MidiService;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(fakeMidi.state, {
      inputNames: ['Midi Through:Midi Through Port-0 14:0', APC, KEYS],
      outputNames: ['Midi Through:Midi Through Port-0 14:0', APC],
      openFailure: null,
      inputs: [],
      outputs: [],
    });
    const emitter2 = new EventEmitter2({ wildcard: true });
    emitted = [];
    emitter2.onAny((event, payload: unknown) => {
      emitted.push({ event: String(event), payload });
    });
    eventEmitter = new AppEventEmitter(emitter2);
    service = new MidiService(eventEmitter);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('GIVEN connected devices WHEN listing THEN returns the input port names', () => {
    expect(service.listPortNames()).toEqual(['Midi Through:Midi Through Port-0 14:0', APC, KEYS]);
  });

  it('GIVEN identical port names WHEN listing THEN later duplicates get a numbered prefix', () => {
    fakeMidi.state.inputNames = MAC_TWO_APC_INPUTS;

    expect(service.listPortNames()).toEqual([
      'APC mini mk2 Control',
      'APC mini mk2 Notes',
      '2- APC mini mk2 Control',
      '2- APC mini mk2 Notes',
    ]);
  });

  it('GIVEN two identical units WHEN each is opened by its listed name THEN each opens its own input and output', () => {
    fakeMidi.state.inputNames = MAC_TWO_APC_INPUTS;
    fakeMidi.state.outputNames = MAC_TWO_APC_OUTPUTS;

    expect(service.open('APC mini mk2 Control')).toBe(true);
    expect(service.open('2- APC mini mk2 Control')).toBe(true);

    expect(fakeMidi.state.inputs.map(input => input.openedIndex).filter(index => index !== null)).toEqual([0, 2]);
    expect(fakeMidi.state.outputs.map(output => output.openedIndex).filter(index => index !== null)).toEqual([0, 2]);
  });

  it('GIVEN a bidirectional device WHEN opened by name THEN both directions open at the current index', () => {
    fakeMidi.state.inputNames = [APC];
    fakeMidi.state.outputNames = [APC];

    expect(service.open(APC)).toBe(true);

    expect(service.openPortNames()).toContain(APC);
    expect(openedInput(APC)).toBeDefined();
    expect(openedOutput(APC)).toBeDefined();
    expect(emitted).toContainEqual({ event: 'midi.outputOpened', payload: { portName: APC } });
  });

  it('GIVEN two devices WHEN each sends a message THEN events carry the source port', () => {
    service.open(APC);
    service.open(KEYS);

    openedInput(APC)?.emit('message', 0, [144, 1, 100]);
    openedInput(KEYS)?.emit('message', 0, [176, 48, 64]);

    expect(emitted.filter(entry => entry.event === 'midi.inputMessage').map(entry => entry.payload)).toEqual([
      { portName: APC, message: [144, 1, 100] },
      { portName: KEYS, message: [176, 48, 64] },
    ]);
  });

  it('GIVEN macOS names the output differently WHEN opened THEN the same-index output of that device opens', () => {
    fakeMidi.state.inputNames = ['APC mini mk2 Control', 'APC mini mk2 Notes'];
    fakeMidi.state.outputNames = ['APC mini mk2 Port 1', 'APC mini mk2 Notes'];

    service.open('APC mini mk2 Control');

    expect(openedOutput('APC mini mk2 Port 1')).toBeDefined();
    expect(emitted).toContainEqual({ event: 'midi.outputOpened', payload: { portName: 'APC mini mk2 Control' } });
  });

  it('GIVEN the same-index output belongs to another device WHEN opened THEN no output opens', () => {
    fakeMidi.state.inputNames = ['Keys MIDI', 'APC mini mk2 Control'];
    fakeMidi.state.outputNames = ['APC mini mk2 Port 1'];

    service.open('Keys MIDI');

    expect(openedOutput('APC mini mk2 Port 1')).toBeUndefined();
    expect(emitted.some(entry => entry.event === 'midi.outputOpened')).toBe(false);
  });

  it('GIVEN a single-word input name without exact output WHEN opened THEN no output opens', () => {
    fakeMidi.state.inputNames = ['Keys'];
    fakeMidi.state.outputNames = ['Synth'];

    service.open('Keys');

    expect(openedOutput('Synth')).toBeUndefined();
  });

  it('GIVEN an input-only device WHEN opened THEN no output opens and no outputOpened event fires', () => {
    service.open(KEYS);

    expect(openedOutput(KEYS)).toBeUndefined();
    expect(emitted.some(entry => entry.event === 'midi.outputOpened')).toBe(false);
  });

  it('GIVEN two open devices WHEN a message is sent to one THEN only that output receives it', () => {
    fakeMidi.state.outputNames = [APC, KEYS];
    service.open(APC);
    service.open(KEYS);

    eventEmitter.emit('midi.sendMessage', { portName: KEYS, message: [0x96, 0, 5] });

    expect(openedOutput(KEYS)?.sent).toEqual([[0x96, 0, 5]]);
    expect(openedOutput(APC)?.sent).toEqual([]);
  });

  it('GIVEN a message for a closed device WHEN sent THEN it is dropped', () => {
    eventEmitter.emit('midi.sendMessage', { portName: APC, message: [0x96, 0, 5] });

    expect(fakeMidi.state.outputs.flatMap(output => output.sent)).toEqual([]);
  });

  it('GIVEN an unknown port WHEN opened THEN returns false', () => {
    expect(service.open('Gone:Gone 40:0')).toBe(false);
    expect(service.openPortNames()).not.toContain('Gone:Gone 40:0');
  });

  it('GIVEN RtMidi fails to open WHEN opening THEN returns false and keeps nothing open', () => {
    fakeMidi.state.openFailure = new Error('ALSA error');

    expect(service.open(APC)).toBe(false);
    expect(service.openPortNames()).not.toContain(APC);
  });

  it('GIVEN an open device WHEN opened again THEN no second port is created', () => {
    service.open(APC);
    const inputsBefore = fakeMidi.state.inputs.length;

    expect(service.open(APC)).toBe(true);
    expect(fakeMidi.state.inputs).toHaveLength(inputsBefore);
  });

  it('GIVEN an open device WHEN closed THEN ports close and later messages are not forwarded', () => {
    service.open(APC);
    const input = openedInput(APC);

    service.close(APC);
    input?.emit('message', 0, [144, 1, 100]);

    expect(service.openPortNames()).not.toContain(APC);
    expect(input?.openedName).toBeNull();
    expect(emitted.some(entry => entry.event === 'midi.inputMessage')).toBe(false);
  });

  it('GIVEN an unknown device WHEN closed THEN nothing happens', () => {
    expect(() => {
      service.close(APC);
    }).not.toThrow();
  });

  describe('probe', () => {
    const REQUEST = [0xf0, 0x7e, 0xf7];
    const SYSEX_REPLY = [0xf0, 0x01, 0xf7];
    const parseSysEx = (message: readonly number[]) => (message[0] === 0xf0 ? 'reply' : null);
    const probe = async (portName: string) => service.probe(portName, REQUEST, parseSysEx, 1000);

    it('GIVEN a device that answers WHEN probed THEN sends the request, resolves the reply and closes its ports', async () => {
      const result = probe(APC);
      await vi.advanceTimersByTimeAsync(0);
      const input = openedInput(APC);
      const output = openedOutput(APC);
      expect(input?.sysexEnabled).toBe(true);
      expect(output?.sent).toEqual([REQUEST]);

      input?.emit('message', 0, SYSEX_REPLY);

      await expect(result).resolves.toBe('reply');
      expect(input?.openedName).toBeNull();
      expect(output?.openedName).toBeNull();
    });

    it('GIVEN two identical units WHEN the second is probed THEN the request goes to its own output', async () => {
      fakeMidi.state.inputNames = MAC_TWO_APC_INPUTS;
      fakeMidi.state.outputNames = MAC_TWO_APC_OUTPUTS;

      const result = probe('2- APC mini mk2 Control');
      await vi.advanceTimersByTimeAsync(0);
      const input = fakeMidi.state.inputs.find(candidate => candidate.openedIndex === 2);
      const output = fakeMidi.state.outputs.find(candidate => candidate.openedIndex === 2);
      expect(output?.sent).toEqual([REQUEST]);

      input?.emit('message', 0, SYSEX_REPLY);

      await expect(result).resolves.toBe('reply');
    });

    it('GIVEN only unrelated messages WHEN the timeout passes THEN resolves null', async () => {
      const result = probe(APC);
      await vi.advanceTimersByTimeAsync(0);

      openedInput(APC)?.emit('message', 0, [0xb0, 48, 64]);
      await vi.advanceTimersByTimeAsync(1000);

      await expect(result).resolves.toBeNull();
    });

    it('GIVEN RtMidi fails to open WHEN probed THEN resolves null', async () => {
      fakeMidi.state.openFailure = new Error('ALSA error');

      await expect(probe(APC)).resolves.toBeNull();
    });

    it('GIVEN an unknown port WHEN probed THEN resolves null', async () => {
      await expect(probe('Gone:Gone 40:0')).resolves.toBeNull();
    });

    it('GIVEN an input-only device WHEN probed THEN resolves null', async () => {
      await expect(probe(KEYS)).resolves.toBeNull();
    });

    it('GIVEN two concurrent probes WHEN the first is running THEN the second waits for it', async () => {
      fakeMidi.state.outputNames = [APC, KEYS];
      const first = probe(APC);
      const second = probe(KEYS);
      await vi.advanceTimersByTimeAsync(0);
      expect(openedInput(KEYS)).toBeUndefined();

      openedInput(APC)?.emit('message', 0, SYSEX_REPLY);
      await first;
      await vi.advanceTimersByTimeAsync(0);
      openedInput(KEYS)?.emit('message', 0, SYSEX_REPLY);

      await expect(second).resolves.toBe('reply');
    });

    it('GIVEN a live device WHEN probed THEN the live input keeps ignoring SysEx', async () => {
      service.open(APC);
      const live = openedInput(APC);

      const result = probe(APC);
      await vi.advanceTimersByTimeAsync(1000);
      await result;

      expect(live?.sysexEnabled).toBe(false);
      expect(service.openPortNames()).toContain(APC);
    });
  });
});
