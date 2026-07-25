import { AppEventEmitter } from '@/events/app-event-emitter';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MidiService } from './midi.service';

type MidiCallback = (...args: unknown[]) => void;

const { inputMock, outputMock } = vi.hoisted(() => ({
  inputMock: {
    getPortCount: vi.fn<() => number>().mockReturnValue(2),
    getPortName: vi.fn<() => string>().mockReturnValue('dev'),
    openPort: vi.fn<(port: number) => void>(),
    closePort: vi.fn<() => void>(),
    on: vi.fn<(event: string, cb: MidiCallback) => void>(),
  },
  outputMock: {
    getPortCount: vi.fn<() => number>().mockReturnValue(1),
    getPortName: vi.fn<() => string>().mockReturnValue('out'),
    openPort: vi.fn<(port: number) => void>(),
    closePort: vi.fn<() => void>(),
    sendMessage: vi.fn<(msg: number[]) => void>(),
  },
}));

vi.mock('midi', () => ({
  default: {
    Input: class {
      public getPortCount = inputMock.getPortCount;
      public getPortName = inputMock.getPortName;
      public openPort = inputMock.openPort;
      public closePort = inputMock.closePort;
      public on = inputMock.on;
    },
    Output: class {
      public getPortCount = outputMock.getPortCount;
      public getPortName = outputMock.getPortName;
      public openPort = outputMock.openPort;
      public closePort = outputMock.closePort;
      public sendMessage = outputMock.sendMessage;
    },
  },
  Input: class {},
  Output: class {},
  MidiMessage: class {},
}));

describe('MidiService', () => {
  let eventEmitter: AppEventEmitter;
  let service: MidiService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = {
      emit: vi.fn<(event: string, payload?: unknown) => boolean>(),
      on: vi.fn<(event: string, listener: (...args: unknown[]) => void) => void>(),
    } as unknown as AppEventEmitter;
    service = new MidiService(eventEmitter);
  });

  it('registers message + sendMessage listeners on construction', () => {
    expect(eventEmitter.on).toHaveBeenCalledWith('midi.sendMessage', expect.any(Function));
    expect(inputMock.on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('forwards incoming midi messages from the input to midi.inputMessage', () => {
    const messageCallback = inputMock.on.mock.calls.find((c: unknown[]) => c[0] === 'message')?.[1];
    expect(typeof messageCallback).toBe('function');
    messageCallback?.(0, [144, 1, 100]);
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.inputMessage', [144, 1, 100]);
  });

  it('sends midi messages when midi.sendMessage is emitted', () => {
    const sendCallback = (
      eventEmitter.on as unknown as Mock<(event: string, listener: MidiCallback) => void>
    ).mock.calls.find((c: unknown[]) => c[0] === 'midi.sendMessage')?.[1];
    expect(typeof sendCallback).toBe('function');
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((cb: MidiCallback) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    });
    sendCallback?.([144, 1, 100]);
    expect(outputMock.sendMessage).toHaveBeenCalledWith([144, 1, 100]);
    spy.mockRestore();
  });

  it('getInputDevices maps port count to dtos', () => {
    expect(service.getInputDevices()).toHaveLength(2);
  });

  it('getOutputDevices maps port count to dtos', () => {
    expect(service.getOutputDevices()).toHaveLength(1);
  });

  it('openPorts opens both and emits events', () => {
    service.openPorts({ inputPort: 0, outputPort: 0 });
    expect(inputMock.openPort).toHaveBeenCalledWith(0);
    expect(outputMock.openPort).toHaveBeenCalledWith(0);
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.inputOpened');
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.outputOpened');
  });

  it('closePorts closes both', () => {
    service.closePorts();
    expect(inputMock.closePort).toHaveBeenCalled();
    expect(outputMock.closePort).toHaveBeenCalled();
  });

  it('handleMidiMessage emits midi.inputMessage', () => {
    (service as unknown as { handleMidiMessage: (port: number, data: number[]) => void }).handleMidiMessage(
      0,
      [144, 1, 100],
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.inputMessage', [144, 1, 100]);
  });

  it('sendMidiMessage sends and waits', async () => {
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((cb: MidiCallback) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    });
    await (service as unknown as { sendMidiMessage: (data: number[]) => Promise<void> }).sendMidiMessage([144, 1, 100]);
    expect(outputMock.sendMessage).toHaveBeenCalledWith([144, 1, 100]);
    spy.mockRestore();
  });
});
