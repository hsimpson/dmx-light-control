import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
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

const midiServiceStub = {
  getInputDevices: () => [{ port: 0, name: 'Test MIDI Input' }],
  getOutputDevices: () => [{ port: 0, name: 'Test MIDI Output' }],
  openPorts: vi.fn(),
  closePorts: vi.fn(),
};

describe('MIDI E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp({ midiService: midiServiceStub });
  });

  afterAll(async () => {
    await app.close();
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
