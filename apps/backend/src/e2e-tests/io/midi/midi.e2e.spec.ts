import { AppModule } from '@/app.module';
import { MidiService } from '@/io/midi/midi.service';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

type GetMidiDevicesQuery = {
  getMidiDevices: {
    inputDevices: { port: number; name: string }[];
    outputDevices: { port: number; name: string }[];
  };
};

type OpenPortsMutation = {
  openPorts: boolean;
};

type ClosePortsMutation = {
  closePorts: boolean;
};

const ORIGINAL_ENV = process.env;

const midiServiceStub = {
  getInputDevices: () => [{ port: 0, name: 'Test MIDI Input' }],
  getOutputDevices: () => [{ port: 0, name: 'Test MIDI Output' }],
  openPorts: vi.fn(),
  closePorts: vi.fn(),
};

describe('MIDI E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      BACKEND_PORT: '3000',
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SerialSendService)
      .useValue({
        onModuleInit: () => undefined,
        onModuleDestroy: () => undefined,
      })
      .overrideProvider(MidiService)
      .useValue(midiServiceStub)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    process.env = ORIGINAL_ENV;
  });

  it('should return MIDI devices via getMidiDevices', async () => {
    const query = gql`
      query {
        getMidiDevices {
          inputDevices {
            name
            port
          }
          outputDevices {
            name
            port
          }
        }
      }
    `;

    const body = await graphqlQuery<GetMidiDevicesQuery>(app.getHttpAdapter().getInstance().server, query);

    expect(body.data?.getMidiDevices.inputDevices).toEqual([{ port: 0, name: 'Test MIDI Input' }]);
    expect(body.data?.getMidiDevices.outputDevices).toEqual([{ port: 0, name: 'Test MIDI Output' }]);
  });

  it('should open MIDI ports via openPorts', async () => {
    const mutation = gql`
      mutation ($openPortsDto: OpenPortsInput!) {
        openPorts(openPortsDto: $openPortsDto)
      }
    `;

    const body = await graphqlQuery<OpenPortsMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        openPortsDto: {
          inputPort: 0,
          outputPort: 0,
        },
      },
    });

    expect(body.data?.openPorts).toBe(true);
    expect(midiServiceStub.openPorts).toHaveBeenCalledWith({ inputPort: 0, outputPort: 0 });
  });

  it('should close MIDI ports via closePorts', async () => {
    const mutation = gql`
      mutation {
        closePorts
      }
    `;

    const body = await graphqlQuery<ClosePortsMutation>(app.getHttpAdapter().getInstance().server, mutation);

    expect(body.data?.closePorts).toBe(true);
    expect(midiServiceStub.closePorts).toHaveBeenCalled();
  });
});
