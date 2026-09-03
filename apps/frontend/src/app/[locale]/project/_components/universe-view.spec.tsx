import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { FixtureChannelPreset, GetProjectDocument } from '@/shared/types/graphql/graphql';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UniverseView from './universe-view';

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

describe('UniverseView', () => {
  it('renders 512 channel squares', async () => {
    renderWithProviders(<UniverseView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Test project',
                createdAt: now,
                updatedAt: now,
                projectFixtures: [],
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('universe-view-grid')).toBeInTheDocument();
    });

    expect(screen.getByTestId('universe-channel-1')).toBeInTheDocument();
    expect(screen.getByTestId('universe-channel-512')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(512);
  });

  it('marks patched fixture channels as occupied', async () => {
    renderWithProviders(<UniverseView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Test project',
                createdAt: now,
                updatedAt: now,
                projectFixtures: [projectFixture],
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('universe-channel-1')).toHaveAttribute('data-occupied', 'true');
    });

    expect(screen.getByTestId('universe-channel-2')).toHaveAttribute('data-occupied', 'true');
    expect(screen.getByTestId('universe-channel-3')).toHaveAttribute('data-occupied', 'true');
    expect(screen.getByTestId('universe-channel-4')).toHaveAttribute('data-occupied', 'false');
    expect(screen.getByTestId('universe-channel-1').querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('universe-channel-4').querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByTestId('universe-channel-1')).toHaveAttribute('data-fixture-variant', '0');
    expect(screen.getByTestId('universe-fixture-label-1')).toHaveTextContent('PAR 64 [1]');
  });

  it('alternates fixture background variants by start address order', async () => {
    const secondFixture = {
      ...projectFixture,
      publicId: 'pf-2',
      startAddress: 10,
    };

    renderWithProviders(<UniverseView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: {
            data: {
              project: {
                __typename: 'ProjectDto',
                publicId: 'proj-1',
                name: 'Test project',
                createdAt: now,
                updatedAt: now,
                projectFixtures: [secondFixture, projectFixture],
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('universe-channel-1')).toHaveAttribute('data-fixture-variant', '0');
    });

    expect(screen.getByTestId('universe-channel-10')).toHaveAttribute('data-fixture-variant', '1');
    expect(screen.getByTestId('universe-fixture-label-1')).toHaveTextContent('PAR 64 [1]');
    expect(screen.getByTestId('universe-fixture-label-2')).toHaveTextContent('PAR 64 [2]');
    expect(
      screen.getByTestId('universe-channel-10').querySelector('[data-testid="universe-fixture-label-2"]'),
    ).toBeInTheDocument();
  });
});
