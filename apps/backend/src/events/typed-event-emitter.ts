import { EventEmitter2, type ListenerFn } from 'eventemitter2';

export class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  public constructor(protected readonly emitter: EventEmitter2) {}

  public emit<TEvent extends keyof TEvents & string>(
    event: TEvent,
    ...args: TEvents[TEvent] extends undefined ? [] : [payload: TEvents[TEvent]]
  ): boolean {
    return this.emitter.emit(event, ...args);
  }

  public on<TEvent extends keyof TEvents & string>(
    event: TEvent,
    listener: (payload: TEvents[TEvent]) => void | Promise<void>,
  ): void {
    this.emitter.on(event, listener as ListenerFn);
  }
}
