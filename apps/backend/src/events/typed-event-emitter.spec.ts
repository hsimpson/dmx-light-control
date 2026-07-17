/// <reference types="vitest/globals" />
import { TypedEventEmitter } from './typed-event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { vi } from 'vitest';

type Events = { 'a.event': { x: number }; 'b.event': undefined };

describe('TypedEventEmitter', () => {
  let emitter: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  let typed: TypedEventEmitter<Events>;

  beforeEach(() => {
    emitter = { emit: vi.fn().mockReturnValue(true), on: vi.fn() };
    typed = new TypedEventEmitter<Events>(emitter as unknown as EventEmitter2);
  });

  it('forwards emit with payload', () => {
    const result = typed.emit('a.event', { x: 1 });
    expect(result).toBe(true);
    expect(emitter.emit).toHaveBeenCalledWith('a.event', { x: 1 });
  });

  it('forwards emit without payload for undefined event', () => {
    typed.emit('b.event');
    expect(emitter.emit).toHaveBeenCalledWith('b.event');
  });

  it('forwards on with a wrapped listener', () => {
    const listener = vi.fn();
    typed.on('a.event', listener);
    expect(emitter.on).toHaveBeenCalledWith('a.event', expect.any(Function));
  });
});
