import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { identityTransform } from '@/projects/project-3d-object.transform';
import {
  SCENE_OBJECT_TYPE_BOX_PUBLIC_ID,
  SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID,
} from '@/projects/scene-object-geometry';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type SceneObjectTypesQuery = {
  sceneObjectTypes: {
    publicId: string;
    name: string;
    isScalable: boolean;
    geometryKind: string;
  }[];
};

type CreateProjectMutation = {
  createProject: {
    publicId: string;
  };
};

type AddProject3dObjectMutation = {
  addProject3dObject: {
    publicId: string;
    name: string;
    sizeX: number | null;
    sizeY: number | null;
    sizeZ: number | null;
    transform: number[];
    sceneObjectType: { publicId: string; isScalable: boolean; name: string };
  };
};

type ProjectQuery = {
  project: {
    project3dObjects: {
      publicId: string;
      name: string;
      sizeX: number | null;
      sceneObjectType: { publicId: string };
    }[];
  } | null;
};

const GET_TYPES = gql`
  query {
    sceneObjectTypes {
      publicId
      name
      isScalable
      geometryKind
    }
  }
`;

const CREATE_PROJECT = gql`
  mutation ($input: CreateProjectInput!) {
    createProject(input: $input) {
      publicId
    }
  }
`;

const ADD_OBJECT = gql`
  mutation ($input: AddProject3dObjectInput!) {
    addProject3dObject(input: $input) {
      publicId
      name
      sizeX
      sizeY
      sizeZ
      transform
      sceneObjectType {
        publicId
        isScalable
        name
      }
    }
  }
`;

const UPDATE_OBJECT = gql`
  mutation ($input: UpdateProject3dObjectInput!) {
    updateProject3dObject(input: $input) {
      publicId
      name
      sizeX
      transform
    }
  }
`;

const DELETE_OBJECT = gql`
  mutation ($publicId: UUID!) {
    deleteProject3dObject(publicId: $publicId) {
      publicId
      deleted
    }
  }
`;

const GET_PROJECT = gql`
  query ($publicId: UUID!) {
    project(publicId: $publicId) {
      project3dObjects {
        publicId
        name
        sizeX
        sceneObjectType {
          publicId
        }
      }
    }
  }
`;

describe('Project 3D objects', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists seeded scene object types', async () => {
    const body = await graphqlQuery<SceneObjectTypesQuery>(app.getHttpAdapter().getInstance().server, GET_TYPES);
    expect(body.errors).toBeUndefined();
    const types = body.data?.sceneObjectTypes ?? [];
    const names = types.map(type => type.name);
    expect(names).toContain('Box');
    expect(names).toContain('Light stand');

    const box = types.find(type => type.name === 'Box');
    const lightStand = types.find(type => type.name === 'Light stand');
    expect(box?.publicId).not.toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(lightStand?.publicId).not.toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(box?.publicId).toBe(SCENE_OBJECT_TYPE_BOX_PUBLIC_ID);
    expect(lightStand?.publicId).toBe(SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID);
  });

  it('adds a box, rejects scaling a stand, updates transform, and deletes', async () => {
    const created = await graphqlQuery<CreateProjectMutation>(
      app.getHttpAdapter().getInstance().server,
      CREATE_PROJECT,
      { variables: { input: { name: '3D Objects Project' } } },
    );
    const projectPublicId = created.data?.createProject.publicId;
    expect(projectPublicId).toBeDefined();

    const box = await graphqlQuery<AddProject3dObjectMutation>(app.getHttpAdapter().getInstance().server, ADD_OBJECT, {
      variables: {
        input: {
          projectPublicId,
          sceneObjectTypePublicId: SCENE_OBJECT_TYPE_BOX_PUBLIC_ID,
        },
      },
    });
    expect(box.errors).toBeUndefined();
    expect(box.data?.addProject3dObject.name).toBe('Box 1');
    expect(box.data?.addProject3dObject.sizeX).toBe(2);
    expect(box.data?.addProject3dObject.sizeY).toBe(0.5);
    expect(box.data?.addProject3dObject.sceneObjectType.isScalable).toBe(true);

    const stand = await graphqlQuery<AddProject3dObjectMutation>(
      app.getHttpAdapter().getInstance().server,
      ADD_OBJECT,
      {
        variables: {
          input: {
            projectPublicId,
            sceneObjectTypePublicId: SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID,
            sizeX: 2,
          },
        },
      },
    );
    expect(stand.errors?.[0]?.message).toContain('fixed size');

    const standOk = await graphqlQuery<AddProject3dObjectMutation>(
      app.getHttpAdapter().getInstance().server,
      ADD_OBJECT,
      {
        variables: {
          input: {
            projectPublicId,
            sceneObjectTypePublicId: SCENE_OBJECT_TYPE_LIGHT_STAND_PUBLIC_ID,
          },
        },
      },
    );
    expect(standOk.errors).toBeUndefined();
    expect(standOk.data?.addProject3dObject.name).toBe('Light stand 1');
    expect(standOk.data?.addProject3dObject.sizeX).toBeNull();

    const duplicateRename = await graphqlQuery(app.getHttpAdapter().getInstance().server, UPDATE_OBJECT, {
      variables: {
        input: {
          publicId: standOk.data?.addProject3dObject.publicId,
          name: 'Box 1',
        },
      },
    });
    expect(duplicateRename.errors?.[0]?.extensions?.code).toBe('PROJECT_3D_OBJECT_NAME_EXISTS');

    const nextTransform = identityTransform(1, 0, 2);
    const updated = await graphqlQuery(app.getHttpAdapter().getInstance().server, UPDATE_OBJECT, {
      variables: {
        input: {
          publicId: box.data?.addProject3dObject.publicId,
          transform: nextTransform,
        },
      },
    });
    expect(updated.errors).toBeUndefined();

    const project = await graphqlQuery<ProjectQuery>(app.getHttpAdapter().getInstance().server, GET_PROJECT, {
      variables: { publicId: projectPublicId },
    });
    expect(project.data?.project?.project3dObjects).toHaveLength(2);
    const objectNames = project.data?.project?.project3dObjects.map(object => object.name) ?? [];
    expect(objectNames).toContain('Box 1');
    expect(objectNames).toContain('Light stand 1');

    const deleted = await graphqlQuery(app.getHttpAdapter().getInstance().server, DELETE_OBJECT, {
      variables: { publicId: box.data?.addProject3dObject.publicId },
    });
    expect(deleted.errors).toBeUndefined();
  });
});
