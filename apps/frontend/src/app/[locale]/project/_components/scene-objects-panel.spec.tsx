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

  it('renames the selected object on blur', async () => {
    const onNameChange = vi.fn();
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
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={onNameChange}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Stage Left');
    await user.tab();

    expect(onNameChange).toHaveBeenCalledWith('Stage Left');
  });

  it('updates rotation and deletes the selected object', async () => {
    const onPoseChange = vi.fn();
    const onDeleteObject = vi.fn();
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
        onSelectObject={vi.fn()}
        onDeleteObject={onDeleteObject}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={onPoseChange}
        onSizeChange={vi.fn()}
      />,
    );

    const rotationY = screen.getByLabelText('Rotation Y');
    await user.clear(rotationY);
    await user.type(rotationY, '45');
    expect(onPoseChange).toHaveBeenCalledWith(expect.objectContaining({ rotationY: 45 }));

    const positionX = screen.getByLabelText('Position X');
    await user.clear(positionX);
    await user.type(positionX, '1.5');
    expect(onPoseChange).toHaveBeenCalledWith(expect.objectContaining({ positionX: 1.5 }));

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDeleteObject).toHaveBeenCalledTimes(1);
  });

  it('shows fixed-size hint for non-scalable objects', () => {
    renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Light Stand', isScalable: false }]}
        objects={[
          {
            publicId: 'obj-1',
            name: 'Stand 1',
            transform: identityTransform,
            sizeX: null,
            sizeY: null,
            sizeZ: null,
            sceneObjectType: {
              publicId: 'type-1',
              name: 'Light Stand',
              geometryKind: SceneObjectGeometryKind.Gltf,
              isScalable: false,
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

    expect(screen.getByText('This object has a fixed size.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Width')).not.toBeInTheDocument();
  });

  it('does not rename when the name is unchanged', async () => {
    const onNameChange = vi.fn();
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
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={onNameChange}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Name'));
    await user.keyboard('{Enter}');
    expect(onNameChange).not.toHaveBeenCalled();
  });

  it('updates every pose axis for the selected object', async () => {
    const onPoseChange = vi.fn();
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
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={onPoseChange}
        onSizeChange={vi.fn()}
      />,
    );

    const axes: { label: string; axis: string; value: string }[] = [
      { label: 'Position Y', axis: 'positionY', value: '2' },
      { label: 'Position Z', axis: 'positionZ', value: '3' },
      { label: 'Rotation X', axis: 'rotationX', value: '15' },
      { label: 'Rotation Z', axis: 'rotationZ', value: '30' },
    ];

    for (const { label, axis, value } of axes) {
      onPoseChange.mockClear();
      const input = screen.getByLabelText(label);
      await user.clear(input);
      await user.type(input, value);
      expect(onPoseChange).toHaveBeenCalledWith(expect.objectContaining({ [axis]: Number(value) }));
    }
  });

  it('changes object type from the dropdown', async () => {
    const onTypeChange = vi.fn();
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[
          { publicId: 'type-1', name: 'Box', isScalable: true },
          { publicId: 'type-2', name: 'Stand', isScalable: false },
        ]}
        objects={[]}
        selectedTypePublicId="type-1"
        selectedObjectPublicId={null}
        scaleGizmoEnabled={false}
        adding={false}
        onTypeChange={onTypeChange}
        onAdd={vi.fn()}
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={vi.fn()}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Object type' }));
    await user.click(await screen.findByRole('option', { name: 'Stand', hidden: true }));
    expect(onTypeChange).toHaveBeenCalledWith('type-2');
  });

  it('toggles the scale gizmo switch', async () => {
    const onScaleGizmoChange = vi.fn();
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
        onSelectObject={vi.fn()}
        onDeleteObject={vi.fn()}
        onScaleGizmoChange={onScaleGizmoChange}
        onNameChange={vi.fn()}
        onPoseChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('switch', { name: 'Scale' }));
    expect(onScaleGizmoChange).toHaveBeenCalledWith(true);
  });

  it('updates length and height for a scalable object', async () => {
    const onSizeChange = vi.fn();
    const { user } = renderWithProviders(
      <SceneObjectsPanel
        types={[{ publicId: 'type-1', name: 'Box', isScalable: true }]}
        objects={[
          {
            publicId: 'obj-1',
            name: 'Box 1',
            transform: identityTransform,
            sizeX: 2,
            sizeY: 1,
            sizeZ: 3,
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

    const lengthInput = screen.getByLabelText('Length');
    await user.clear(lengthInput);
    await user.type(lengthInput, '4');
    expect(onSizeChange).toHaveBeenCalledWith('sizeZ', expect.any(Number));

    const heightInput = screen.getByLabelText('Height');
    await user.clear(heightInput);
    await user.type(heightInput, '2');
    expect(onSizeChange).toHaveBeenCalledWith('sizeY', expect.any(Number));
  });
});
