import { AppModule } from '@/app.module';
import { registerHttpPlugins } from '@/http-plugins';
import { IoDeviceDiscoveryService } from '@/io/devices/io-device-discovery.service';
import { DmxSendService } from '@/io/dmx/dmx-send.service';
import { MidiService } from '@/io/midi/midi.service';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

export async function createE2eApp(): Promise<NestFastifyApplication> {
  process.env.BACKEND_PORT ??= '3000';

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SerialSendService)
    .useValue({
      onModuleInit: () => undefined,
      onModuleDestroy: () => undefined,
      openPaths: () => [],
    })
    .overrideProvider(IoDeviceDiscoveryService)
    .useValue({ listAvailable: async () => Promise.resolve([]) })
    .overrideProvider(DmxSendService)
    .useValue({
      onModuleInit: () => undefined,
    })
    .overrideProvider(MidiService)
    .useValue({
      listPortNames: () => [],
      openPortNames: () => [],
    })
    .compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await registerHttpPlugins(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
