export type DmxWsSocket = {
  readonly OPEN: number;
  readyState: number;
  send: (data: string) => void;
  on: (event: 'message' | 'close', listener: (raw: Buffer | string) => void) => void;
  close: () => void;
};

type DmxWebsocketConnectionHandler = (socket: DmxWsSocket) => void;

let connectionHandler: DmxWebsocketConnectionHandler | undefined;

export function setDmxWebsocketConnectionHandler(handler: DmxWebsocketConnectionHandler | undefined): void {
  connectionHandler = handler;
}

export function handleDmxWebsocketConnection(socket: DmxWsSocket): void {
  connectionHandler?.(socket);
}
