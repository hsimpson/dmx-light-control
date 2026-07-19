import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppEventEmitter } from '@/events/app-event-emitter';
import { MidiService } from './midi.service';

const { inputMock, outputMock } = vi.hoisted(() => ({
  inputMock: {
    getPortCount: vi.fn().mockReturnValue(2),
    getPortName: vi.fn().mockReturnValue('dev'),
    openPort: vi.fn(),
    closePort: vi.fn(),
    on: vi.fn(),
  },
  outputMock: {
    getPortCount: vi.fn().mockReturnValue(1),
    getPortName: vi.fn().mockReturnValue('out'),
    openPort: vi.fn(),
    closePort: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

vi.mock('midi', () => ({
  default: {
    Input: class {
      getPortCount = inputMock.getPortCount;
      getPortName = inputMock.getPortName;
      openPort = inputMock.openPort;
      closePort = inputMock.closePort;
      on = inputMock.on;
    },
    Output: class {
      getPortCount = outputMock.getPortCount;
      getPortName = outputMock.getPortName;
      openPort = outputMock.openPort;
      closePort = outputMock.closePort;
      sendMessage = outputMock.sendMessage;
    },
  },
  Input: class {},
  Output: class {},
  MidiMessage: class {},
}));

describe('MidiService', () => {
  let eventEmitter: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  let service: MidiService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = { emit: vi.fn(), on: vi.fn() };
    service = new MidiService(eventEmitter as unknown as AppEventEmitter);
  });

  it('registers message + sendMessage listeners on construction', () => {
    expect(eventEmitter.on).toHaveBeenCalledWith('midi.sendMessage', expect.any(Function));
    expect(inputMock.on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('forwards incoming midi messages from the input to midi.inputMessage', () => {
    const messageCallback = inputMock.on.mock.calls.find((c: any[]) => c[0] === 'message')?.[1];
    expect(typeof messageCallback).toBe('function');
    messageCallback(0, [144, 1, 100]);
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.inputMessage', [144, 1, 100]);
  });

  it('sends midi messages when midi.sendMessage is emitted', async () => {
    const sendCallback = (eventEmitter.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: any[]) => c[0] === 'midi.sendMessage',
    )?.[1];
    expect(typeof sendCallback).toBe('function');
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    });
    await sendCallback([144, 1, 100]);
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
    service.openPorts({ inputPort: 0, outputPort: 0 } as any);
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
    (service as any).handleMidiMessage(0, [144, 1, 100]);
    expect(eventEmitter.emit).toHaveBeenCalledWith('midi.inputMessage', [144, 1, 100]);
  });

  it('sendMidiMessage sends and waits', async () => {
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    });
    await (service as any).sendMidiMessage([144, 1, 100]);
    expect(outputMock.sendMessage).toHaveBeenCalledWith([144, 1, 100]);
    spy.mockRestore();
  });
});
