import { dmxStore } from '@/lib/dmx/dmx-store';
import { FixtureChannelPreset, GetProjectDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DmxView from './dmx-view';

const now = new Date('2026-01-01T00:00:00.000Z');

const projectFixture = {
  __typename: 'ProjectFixtureDto' as const,
  publicId: 'pf-1',
  startAddress: 1,
  fixture: {
    __typename: 'FixtureDto' as const,
    publicId: 'fix-1',
    name: 'PAR 64',
    fixtureVendor: { __typename: 'FixtureVendorDto' as const, publicId: 'vendor-1', name: 'Generic' },
  },
  channelMode: {
    __typename: 'FixtureChannelModeDto' as const,
    publicId: 'mode-1',
    name: '3ch',
    fixtureChannelAssignments: [
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 1,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityRed,
        },
      },
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 2,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityGreen,
        },
      },
      {
        __typename: 'ProjectFixtureChannelAssignmentDto' as const,
        channelNumber: 3,
        fixtureChannelDefinition: {
          __typename: 'ProjectFixtureChannelDefinitionDto' as const,
          preset: FixtureChannelPreset.IntensityBlue,
        },
      },
    ],
  },
  createdAt: now,
  updatedAt: now,
};

function projectResult(projectFixtures: (typeof projectFixture)[]) {
  return {
    data: {
      project: {
        __typename: 'ProjectDto' as const,
        publicId: 'proj-1',
        name: 'Test project',
        environmentType: 'SimpleGround',
        roomWidth: 10,
        roomLength: 8,
        roomHeight: 5,
        createdAt: now,
        updatedAt: now,
        projectFixtures,
        project3dObjects: [],
      },
    },
  };
}

describe('DmxView', () => {
  it('shows an empty state when no fixtures are patched', async () => {
    renderWithProviders(<DmxView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: projectResult([]),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('No fixtures patched yet')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('dmx-view')).not.toBeInTheDocument();
  });

  it('renders a fixture box with label, preset icons, and placeholder DMX values', async () => {
    renderWithProviders(<DmxView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: projectResult([projectFixture]),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('dmx-view')).toBeInTheDocument();
    });

    expect(screen.getByTestId('dmx-fixture-pf-1')).toHaveAttribute('data-fixture-variant', '0');
    expect(screen.getByTestId('dmx-fixture-label-1')).toHaveTextContent('PAR 64 [1]');
    expect(screen.getAllByTestId(/dmx-channel-/)).toHaveLength(3);
    expect(screen.getByTestId('dmx-channel-1').querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('dmx-channel-2').querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('dmx-channel-3').querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('dmx-channel-1')).toHaveTextContent('0');
    expect(screen.getByTestId('dmx-channel-2')).toHaveTextContent('0');
    expect(screen.getByTestId('dmx-channel-3')).toHaveTextContent('0');
    expect(screen.getByTestId('dmx-channel-1')).toHaveAttribute('aria-label', '1: Generic – PAR 64');
  });

  it('shows live DMX values from the client store', async () => {
    dmxStore.getState().applyDelta([{ channel: 1, value: 200 }]);

    renderWithProviders(<DmxView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: projectResult([projectFixture]),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('dmx-channel-1')).toHaveTextContent('200');
    });
    expect(screen.getByTestId('dmx-channel-2')).toHaveTextContent('0');
  });

  it('orders fixture boxes by start address and alternates variants', async () => {
    const laterFixture = {
      ...projectFixture,
      publicId: 'pf-2',
      startAddress: 10,
    };

    renderWithProviders(<DmxView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: projectResult([laterFixture, projectFixture]),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('dmx-fixture-pf-1')).toBeInTheDocument();
    });

    const boxes = screen.getAllByTestId(/dmx-fixture-pf-/);
    expect(boxes.map(box => box.getAttribute('data-testid'))).toEqual(['dmx-fixture-pf-1', 'dmx-fixture-pf-2']);
    expect(screen.getByTestId('dmx-fixture-pf-1')).toHaveAttribute('data-fixture-variant', '0');
    expect(screen.getByTestId('dmx-fixture-pf-2')).toHaveAttribute('data-fixture-variant', '1');
    expect(screen.getByTestId('dmx-fixture-label-1')).toHaveTextContent('PAR 64 [1]');
    expect(screen.getByTestId('dmx-fixture-label-2')).toHaveTextContent('PAR 64 [2]');
  });
});
