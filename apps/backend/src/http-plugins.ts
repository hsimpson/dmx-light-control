import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { join } from 'node:path';
import { FIXTURE_ASSET_MAX_BYTES, resolveAssetsRoot } from './fixtures/fixture-asset-path';
import { handleDmxWebsocketConnection, type DmxWsSocket } from './io/dmx/dmx-websocket.connection';
import { DMX_WS_PATH } from './io/dmx/dmx-ws.protocol';

type FastifyWebsocketHost = {
  get: (path: string, opts: { websocket: true }, handler: (socket: DmxWsSocket) => void) => void;
};

export async function registerHttpPlugins(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyWebsocket);
  await app.register((instance: FastifyWebsocketHost, _opts: unknown, done: () => void) => {
    instance.get(DMX_WS_PATH, { websocket: true }, socket => {
      handleDmxWebsocketConnection(socket);
    });
    done();
  });
  await app.register(multipart, {
    limits: { fileSize: FIXTURE_ASSET_MAX_BYTES },
  });
  await app.register(fastifyStatic, {
    root: resolveAssetsRoot(process.cwd(), join(__dirname, 'assets')),
    prefix: '/assets/',
  });
}
