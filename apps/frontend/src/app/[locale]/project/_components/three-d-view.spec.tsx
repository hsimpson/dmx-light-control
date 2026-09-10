import { renderWithProviders } from '@/testhelpers/render-with-providers';
import {
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
});
