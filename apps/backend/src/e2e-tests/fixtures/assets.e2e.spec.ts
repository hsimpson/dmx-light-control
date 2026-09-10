import { setupCatalogFixture } from './catalog-fixture';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

function pngMultipart(filename: string): { payload: Buffer; headers: Record<string, string> } {
  const boundary = '----fixtureAssetBoundary';
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([header, Buffer.from([0x89, 0x50, 0x4e, 0x47]), footer]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

describe('Fixture asset REST', () => {
  let app: NestFastifyApplication;
  let assetsRoot: string;
  let fixturePublicId: string;

  beforeAll(async () => {
    assetsRoot = await mkdtemp(join(tmpdir(), 'fixture-asset-e2e-'));
    process.env.FIXTURE_ASSETS_ROOT = assetsRoot;
    app = await createE2eApp();
    const catalog = await setupCatalogFixture(app.getHttpAdapter().getInstance().server, {
      fixtureName: 'E2E Asset Par',
    });
    fixturePublicId = catalog.fixturePublicId;
  });

  afterAll(async () => {
    await app.close();
    await rm(assetsRoot, { recursive: true, force: true });
    delete process.env.FIXTURE_ASSETS_ROOT;
  });

  it('uploads and deletes a product picture', async () => {
    const inject = app.getHttpAdapter().getInstance();
    const multipart = pngMultipart('photo.png');
    const uploaded = await inject.inject({
      method: 'POST',
      url: `/fixtures/${fixturePublicId}/assets/picture`,
      payload: multipart.payload,
      headers: multipart.headers,
    });

    expect(uploaded.statusCode).toBe(201);
    const body = JSON.parse(uploaded.body) as { path: string };
    expect(body.path).toMatch(/^\/assets\/fixtures\/.+\/picture\.png$/);

    const deleted = await inject.inject({
      method: 'DELETE',
      url: `/fixtures/${fixturePublicId}/assets/picture`,
    });
    expect(deleted.statusCode).toBe(200);
    expect(JSON.parse(deleted.body)).toEqual({ kind: 'picture', path: null });
  });
});
