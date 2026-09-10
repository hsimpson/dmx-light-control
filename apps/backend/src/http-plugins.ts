import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { join } from 'node:path';
import { FIXTURE_ASSET_MAX_BYTES, resolveAssetsRoot } from './fixtures/fixture-asset-path';

export async function registerHttpPlugins(app: NestFastifyApplication): Promise<void> {
  await app.register(multipart, {
    limits: { fileSize: FIXTURE_ASSET_MAX_BYTES },
  });
  await app.register(fastifyStatic, {
    root: resolveAssetsRoot(process.cwd(), join(__dirname, 'assets')),
    prefix: '/assets/',
  });
}
