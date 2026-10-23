import { GetProjectIoDevicesDocument, IoDeviceKind } from '@/shared/types/graphql/graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphqlClient } from './graphql-client';

const ftdi = {
  __typename: 'IoDeviceDto' as const,
  kind: IoDeviceKind.DmxSerial,
  name: 'FT232R USB UART',
  manufacturer: 'FTDI',
  serial: 'A50285BI',
  vendorId: '0403',
  productId: '6001',
  usbLocation: '3-10',
};

const writeIoDevices = (ioDevices: (typeof ftdi)[]) => {
  graphqlClient.cache.writeQuery({
    query: GetProjectIoDevicesDocument,
    variables: { publicId: 'proj-1' },
    data: { project: { __typename: 'ProjectDto', publicId: 'proj-1', ioDevices } },
  });
};

describe('graphqlClient cache', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await graphqlClient.clearStore();
  });

  it('GIVEN cached project devices WHEN a saved list replaces them THEN the new list wins without a merge warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    writeIoDevices([ftdi]);

    writeIoDevices([]);

    const cached = graphqlClient.cache.readQuery({
      query: GetProjectIoDevicesDocument,
      variables: { publicId: 'proj-1' },
    });
    expect(cached?.project?.ioDevices).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});
