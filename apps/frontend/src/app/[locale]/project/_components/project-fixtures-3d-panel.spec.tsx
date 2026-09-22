import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ProjectFixtures3dPanel from './project-fixtures-3d-panel';
import { composeTransformFromPose } from './scene-object-pose';

const identityTransform = composeTransformFromPose({
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
});

const positionedTransform = composeTransformFromPose({
  positionX: 1,
  positionY: 2,
  positionZ: 3,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
});

const fixture = {
  publicId: 'pf-1',
  startAddress: 12,
  transform: identityTransform,
  fixture: {
    name: 'PAR 64',
    fixtureVendor: { name: 'Generic' },
  },
};

describe('ProjectFixtures3dPanel', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('edits position of the selected fixture', async () => {
    const onPoseChange = vi.fn();
    const { user } = renderWithProviders(
      <ProjectFixtures3dPanel
        fixtures={[{ ...fixture, transform: positionedTransform }]}
        selectedFixturePublicId="pf-1"
        onSelectFixture={vi.fn()}
        onPoseChange={onPoseChange}
      />,
    );

    const positionX = screen.getByLabelText('Position X');
    await user.clear(positionX);
    await user.type(positionX, '4');
    expect(onPoseChange).toHaveBeenCalledWith(
      expect.objectContaining({
        positionX: 4,
        positionY: 2,
        positionZ: 3,
      }),
    );
  });

  it('lists patched fixtures by name and universe number', async () => {
    const onSelectFixture = vi.fn();
    const { user } = renderWithProviders(
      <ProjectFixtures3dPanel
        fixtures={[fixture]}
        selectedFixturePublicId={null}
        onSelectFixture={onSelectFixture}
        onPoseChange={vi.fn()}
      />,
    );

    await user.click(screen.getByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'PAR 64 [1]', hidden: true }));
    expect(onSelectFixture).toHaveBeenCalledWith('pf-1');
  });

  it('numbers fixtures by start address like the universe view', async () => {
    const { user } = renderWithProviders(
      <ProjectFixtures3dPanel
        fixtures={[
          {
            ...fixture,
            publicId: 'pf-late',
            startAddress: 20,
            fixture: { name: 'Wash', fixtureVendor: { name: 'Generic' } },
          },
          fixture,
        ]}
        selectedFixturePublicId={null}
        onSelectFixture={vi.fn()}
        onPoseChange={vi.fn()}
      />,
    );

    await user.click(screen.getByPlaceholderText('None'));
    expect(await screen.findByRole('option', { name: 'PAR 64 [1]', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wash [2]', hidden: true })).toBeInTheDocument();
  });
});
