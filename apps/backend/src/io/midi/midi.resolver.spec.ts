import { describe, expect, it, vi } from 'vitest';
import { MidiResolver } from './midi.resolver';
import { MidiService } from './midi.service';

function build() {
  const midiService = {
    getInputDevices: vi.fn().mockReturnValue([{ port: 0, name: 'in' }]),
    getOutputDevices: vi.fn().mockReturnValue([{ port: 0, name: 'out' }]),
    openPorts: vi.fn(),
    closePorts: vi.fn(),
  } as unknown as MidiService;
  return { resolver: new MidiResolver(midiService), midiService };
}

describe('MidiResolver', () => {
  it('getInputDevices returns both device lists', () => {
    const { resolver } = build();
    const res = resolver.getInputDevices();
    expect(res.inputDevices).toHaveLength(1);
    expect(res.outputDevices).toHaveLength(1);
  });

  it('openPorts delegates and returns true', () => {
    const { resolver, midiService } = build();
    expect(resolver.openPorts({ inputPort: 1, outputPort: 1 })).toBe(true);
    expect(midiService.openPorts).toHaveBeenCalled();
  });

  it('closePorts delegates and returns true', () => {
    const { resolver, midiService } = build();
    expect(resolver.closePorts()).toBe(true);
    expect(midiService.closePorts).toHaveBeenCalled();
  });
});
