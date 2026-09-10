import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { SceneObjectGeometryKind } from '@/shared/types/graphql/graphql';
import { screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { composeTransformFromPose } from './scene-object-pose';
import SceneObjectsPanel from './scene-objects-panel';

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

describe('SceneObjectsPanel', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('adds the selected type to the scene', async () => {
    const onAdd = vi.fn();
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Box', isScalable: true }]}
        objects={[]}
        selectedTypePublicId="type-1"
        selectedObjectPublicId={null}
        scaleGizmoEnabled={false}
        adding={false}
        onTypeChange={vi.fn()}
        onAdd={onAdd}
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add to scene' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('edits size for a selected scalable object', async () => {
    const onSizeChange = vi.fn();
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Box', isScalable: true }]}
        objects={[
          {
            publicId: 'obj-1',
            name: 'Stage Left',
            transform: identityTransform,
            sizeX: 2,
            sizeY: 0.5,
            sizeZ: 1,
            sceneObjectType: {
              publicId: 'type-1',
              name: 'Box',
              geometryKind: SceneObjectGeometryKind.Box,
              isScalable: true,
            },
          },
        ]}
        selectedTypePublicId="type-1"
        selectedObjectPublicId="obj-1"
        scaleGizmoEnabled={false}
        adding={false}
        onTypeChange={vi.fn()}
        onAdd={vi.fn()}
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={onSizeChange}
      />,
    );

    const widthInput = screen.getAllByLabelText('Width')[0];
    if (!widthInput) {
      throw new Error('missing width');
    }
    await user.clear(widthInput);
    await user.type(widthInput, '3');
    expect(onSizeChange).toHaveBeenCalled();
  });

  it('shows stored name and position inputs for the selected object', async () => {
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Light Stand', isScalable: true }]}
        objects={[
          {
            publicId: 'obj-1',
            name: 'Box 1',
            transform: positionedTransform,
            sizeX: 2,
            sizeY: 0.5,
            sizeZ: 1,
            sceneObjectType: {
              publicId: 'type-1',
              name: 'Light Stand',
              geometryKind: SceneObjectGeometryKind.Box,
              isScalable: true,
            },
          },
        ]}
        selectedTypePublicId="type-1"
        selectedObjectPublicId="obj-1"
        scaleGizmoEnabled={false}
        adding={false}
        onTypeChange={vi.fn()}
        onAdd={vi.fn()}
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Box 1');
    expect(screen.getByLabelText('Position X')).toHaveValue('1 m');
    expect(screen.getByLabelText('Position Y')).toHaveValue('2 m');
    expect(screen.getByLabelText('Position Z')).toHaveValue('3 m');
    await user.click(screen.getByRole('combobox', { name: 'Selected object' }));
    await waitFor(() => {
      expect(screen.getByText('Box 1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Light Stand 1')).not.toBeInTheDocument();
  });

  it('clears the selected object', async () => {
    const onSelectObject = vi.fn();
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Box', isScalable: true }]}
        objects={[
          {
            publicId: 'obj-1',
            name: 'Box 1',
            transform: identityTransform,
            sizeX: 1,
            sizeY: 1,
            sizeZ: 1,
            sceneObjectType: {
              publicId: 'type-1',
              name: 'Box',
              geometryKind: SceneObjectGeometryKind.Box,
              isScalable: true,
            },
          },
        ]}
        selectedTypePublicId="type-1"
        selectedObjectPublicId="obj-1"
        scaleGizmoEnabled={false}
        adding={false}
        onTypeChange={vi.fn()}
        onAdd={vi.fn()}
        onSelectObject={onSelectObject}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Clear selection', { selector: 'button', hidden: true }));
    expect(onSelectObject).toHaveBeenCalledWith(null);
  });
});
