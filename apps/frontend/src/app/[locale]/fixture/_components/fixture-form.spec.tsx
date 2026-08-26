import { renderWithProviders } from '@/testhelpers/render-with-providers';
import {
  FixtureChannelPreset,
  GetFixturesQuery,
  GetFixtureVendorsQuery,
  UpdateFixtureDocument,
  UpdateFixtureMutationVariables,
} from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureForm from './fixture-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const now = new Date('2026-01-01T00:00:00.000Z');
const redPublicId = '11111111-1111-4111-8111-111111111111';
const strobePublicId = '22222222-2222-4222-8222-222222222222';
const fixturePublicId = '33333333-3333-4333-8333-333333333333';
const vendorPublicId = '44444444-4444-4444-8444-444444444444';
const modePublicId = '55555555-5555-4555-8555-555555555555';

const redDefinition = {
  publicId: redPublicId,
  name: 'Red',
  order: 0,
  preset: FixtureChannelPreset.Custom,
  createdAt: now,
  updatedAt: now,
  fixtureChannelRanges: [],
};

const strobeDefinition = {
  publicId: strobePublicId,
  name: 'Strobe',
  order: 1,
  preset: FixtureChannelPreset.Custom,
  createdAt: now,
  updatedAt: now,
  fixtureChannelRanges: [],
};

const vendor: GetFixtureVendorsQuery['fixtureVendors'][number] = {
  publicId: vendorPublicId,
  name: 'Chauvet',
  createdAt: now,
  updatedAt: now,
};

const existingFixture: GetFixturesQuery['fixtures'][number] = {
  publicId: fixturePublicId,
  name: 'SlimPAR',
  createdAt: now,
  updatedAt: now,
  fixtureVendor: vendor,
  fixtureChannelDefinitions: [redDefinition],
  fixtureChannelModes: [
    {
      publicId: modePublicId,
      name: '8ch',
      order: 0,
      createdAt: now,
      updatedAt: now,
      fixtureChannelAssignments: [],
    },
  ],
};

const savedFixture: GetFixturesQuery['fixtures'][number] = {
  ...existingFixture,
  fixtureChannelDefinitions: [redDefinition, strobeDefinition],
};

describe('FixtureForm', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('hydrates new channel definition publicIds from updateFixture so the next save updates them', async () => {
    const updateInputs: UpdateFixtureMutationVariables['input'][] = [];

    const { user } = renderWithProviders(<FixtureForm fixture={existingFixture} vendors={[vendor]} />, {
      apolloMocks: [
        {
          request: {
            query: UpdateFixtureDocument,
            variables: () => true,
          },
          maxUsageCount: 2,
          result: (variables: UpdateFixtureMutationVariables) => {
            updateInputs.push(variables.input);
            return { data: { updateFixture: savedFixture } };
          },
        },
      ],
    });

    await user.type(screen.getByPlaceholderText('Add Channel Definition'), 'Strobe');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'green', message: 'Fixture updated successfully' }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateInputs).toHaveLength(2);
    });

    const secondDefinitions = updateInputs[1]?.channelDefinitions ?? [];
    expect(secondDefinitions.find(definition => definition.name === 'Red')?.publicId).toBe(redPublicId);
    expect(secondDefinitions.find(definition => definition.name === 'Strobe')?.publicId).toBe(strobePublicId);
  });
});
