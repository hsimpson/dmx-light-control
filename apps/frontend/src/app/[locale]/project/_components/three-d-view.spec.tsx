import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { CombinedGraphQLErrors } from '@apollo/client';
import {
  AddProject3dObjectDocument,
  DeleteProject3dObjectDocument,
  GetProjectDocument,
  GetSceneObjectTypesDocument,
  ProjectEnvironmentType,
  SceneObjectGeometryKind,
  UpdateProject3dObjectDocument,
  UpdateProjectDocument,
} from '@/shared/types/graphql/graphql';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { composeTransformFromPose } from './scene-object-pose';
import ThreeDView from './three-d-view';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./three-d-room-canvas', () => ({
  default: ({ poseGizmoMode }: { poseGizmoMode?: string }) => (
    <div data-testid="three-d-room-canvas" data-pose-gizmo-mode={poseGizmoMode} />
  ),
}));

const now = new Date('2026-01-01T00:00:00.000Z');
const identityTransform = composeTransformFromPose({
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
});

const sceneObjectType = {
  __typename: 'SceneObjectTypeDto' as const,
  publicId: 'type-1',
  name: 'Box',
  geometryKind: SceneObjectGeometryKind.Box,
  modelPath: null,
  isScalable: true,
  defaultSizeX: 1,
  defaultSizeY: 1,
  defaultSizeZ: 1,
  createdAt: now,
  updatedAt: now,
};

const project3dObject = {
  __typename: 'Project3dObjectDto' as const,
  publicId: 'obj-1',
  name: 'Box 1',
  sizeX: 1,
  sizeY: 1,
  sizeZ: 1,
  transform: identityTransform,
  sceneObjectType,
  createdAt: now,
  updatedAt: now,
};

const project = {
  __typename: 'ProjectDto' as const,
  publicId: 'proj-1',
  name: 'Main Show',
  environmentType: ProjectEnvironmentType.SimpleGround,
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  createdAt: now,
  updatedAt: now,
  projectFixtures: [],
  project3dObjects: [],
};

describe('ThreeDView', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('shows loading while the project query is in flight', () => {
    renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          delay: Number.POSITIVE_INFINITY,
          result: { data: { project } },
        },
      ],
    });

    expect(document.querySelector('.mantine-Loader-root')).not.toBeNull();
  });

  it('saves room dimensions with the project name', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: ProjectEnvironmentType.SimpleGround,
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
          result: {
            data: {
              updateProject: {
                ...project,
                environmentType: ProjectEnvironmentType.SimpleGround,
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Width')).toHaveValue('10 m');
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
    });
  });

  it('persists pose only when Save is clicked', async () => {
    let getProjectCount = 0;
    let updateCount = 0;
    const projectWithObject = {
      ...project,
      project3dObjects: [project3dObject],
    };

    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: () => {
            getProjectCount += 1;
            return { data: { project: projectWithObject } };
          },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: () => true,
          },
          result: {
            data: {
              updateProject: {
                ...projectWithObject,
              },
            },
          },
        },
        {
          request: {
            query: UpdateProject3dObjectDocument,
            variables: () => true,
          },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: () => {
            updateCount += 1;
            return { data: { updateProject3dObject: project3dObject } };
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('three-d-room-canvas')).toBeInTheDocument();
    });
    const getProjectCountAfterLoad = getProjectCount;

    await user.click(screen.getByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'Box 1', hidden: true }));

    const positionX = screen.getByLabelText('Position X');
    await user.clear(positionX);
    await user.type(positionX, '2');

    expect(updateCount).toBe(0);
    expect(getProjectCount).toBe(getProjectCountAfterLoad);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateCount).toBeGreaterThan(0);
    });
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
  });

  it('shows gizmo key hints and switches pose gizmo mode with T and R', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    const canvas = await screen.findByTestId('three-d-room-canvas');
    expect(screen.getByText('T Move')).toBeInTheDocument();
    expect(screen.getByText('R Rotate')).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-pose-gizmo-mode', 'translate');

    await user.click(canvas);
    await user.keyboard('r');
    expect(canvas).toHaveAttribute('data-pose-gizmo-mode', 'rotate');

    await user.keyboard('t');
    expect(canvas).toHaveAttribute('data-pose-gizmo-mode', 'translate');
  });

  it('shows not found when the project query returns null', async () => {
    renderWithProviders(<ThreeDView projectPublicId="missing" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'missing' } },
          result: { data: { project: null } },
        },
      ],
    });

    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });

  it('shows an error when add object fails', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: AddProject3dObjectDocument,
            variables: {
              input: { projectPublicId: 'proj-1', sceneObjectTypePublicId: 'type-1' },
            },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add to scene' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Add to scene' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });
  });

  it('deletes the selected object', async () => {
    const projectWithObject = { ...project, project3dObjects: [project3dObject] };
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          maxUsageCount: Number.POSITIVE_INFINITY,
          result: { data: { project: projectWithObject } },
        },
        {
          request: {
            query: DeleteProject3dObjectDocument,
            variables: { publicId: 'obj-1' },
          },
          result: { data: { deleteProject3dObject: { publicId: 'obj-1', deleted: true } } },
        },
      ],
    });

    await user.click(await screen.findByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'Box 1', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('None')).toHaveValue('');
    });
  });

  it('shows an error when delete object fails', async () => {
    const projectWithObject = { ...project, project3dObjects: [project3dObject] };
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithObject } },
        },
        {
          request: {
            query: DeleteProject3dObjectDocument,
            variables: { publicId: 'obj-1' },
          },
          error: new Error('network'),
        },
      ],
    });

    await user.click(await screen.findByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'Box 1', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to delete object' }),
      );
    });
  });

  it('shows a duplicate-name error when rename fails', async () => {
    const projectWithObject = { ...project, project3dObjects: [project3dObject] };
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithObject } },
        },
        {
          request: {
            query: UpdateProject3dObjectDocument,
            variables: { input: { publicId: 'obj-1', name: 'Taken' } },
          },
          error: new CombinedGraphQLErrors({
            errors: [{ message: 'exists', extensions: { code: 'PROJECT_3D_OBJECT_NAME_EXISTS' } }],
          }),
        },
      ],
    });

    await user.click(await screen.findByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'Box 1', hidden: true }));

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Taken');
    await user.tab();

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'That name is already used in this project' }),
      );
    });
  });

  it('shows a generic error when rename fails for other reasons', async () => {
    const projectWithObject = { ...project, project3dObjects: [project3dObject] };
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [sceneObjectType] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithObject } },
        },
        {
          request: {
            query: UpdateProject3dObjectDocument,
            variables: { input: { publicId: 'obj-1', name: 'Broken' } },
          },
          error: new Error('network'),
        },
      ],
    });

    await user.click(await screen.findByPlaceholderText('None'));
    await user.click(await screen.findByRole('option', { name: 'Box 1', hidden: true }));

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Broken');
    await user.tab();

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to update object' }),
      );
    });
  });

  it('shows an error when save fails', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: ProjectEnvironmentType.SimpleGround,
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Width')).toHaveValue('10 m');
    });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Failed to save environment' }),
      );
    });
  });

  it('ignores gizmo shortcuts when a modifier key is held', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    const canvas = await screen.findByTestId('three-d-room-canvas');
    await user.click(canvas);
    await user.keyboard('{Control>}r{/Control}');
    expect(canvas).toHaveAttribute('data-pose-gizmo-mode', 'translate');
  });

  it('drafts room length and height before save', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: ProjectEnvironmentType.SimpleGround,
                roomWidth: 10,
                roomLength: 12,
                roomHeight: 6,
              },
            },
          },
          result: {
            data: {
              updateProject: {
                ...project,
                roomLength: 12,
                roomHeight: 6,
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Length')).toHaveValue('8 m');
    });

    const lengthInput = screen.getByLabelText('Length');
    await user.clear(lengthInput);
    await user.type(lengthInput, '12');

    const heightInput = screen.getByLabelText('Height');
    await user.clear(heightInput);
    await user.type(heightInput, '6');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
    });
  });

  it('drafts environment type before save', async () => {
    const { user } = renderWithProviders(<ThreeDView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetSceneObjectTypesDocument },
          result: { data: { sceneObjectTypes: [] } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                name: 'Main Show',
                environmentType: ProjectEnvironmentType.Room,
                roomWidth: 10,
                roomLength: 8,
                roomHeight: 5,
              },
            },
          },
          result: {
            data: {
              updateProject: {
                ...project,
                environmentType: ProjectEnvironmentType.Room,
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Width')).toHaveValue('10 m');
    });

    await user.click(screen.getByRole('combobox', { name: 'Environment' }));
    await user.click(await screen.findByRole('option', { name: 'Room', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
    });
  });
});
