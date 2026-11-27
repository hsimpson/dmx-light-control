import { registerGlobals } from '@/app-globals';
import { AppModule } from '@/app.module';
import { registerHttpPlugins } from '@/http-plugins';
import { IoDeviceDiscoveryService } from '@/io/devices/io-device-discovery.service';
import { DmxSendService } from '@/io/dmx/dmx-send.service';
import { MidiService } from '@/io/midi/midi.service';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModuleBuilder } from '@nestjs/testing';

/** `override` replaces more I/O providers on top of the standard fakes (e.g. the audio output). */
export async function createE2eApp(
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = builder => builder,
): Promise<NestFastifyApplication> {
  process.env.BACKEND_PORT ??= '3000';

  const builder = Test.createTestingModule({
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
    });
  const moduleFixture = await override(builder).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  registerGlobals(app);
  await registerHttpPlugins(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
