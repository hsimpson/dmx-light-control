'use client';

import { Loading } from '@/components/loading';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddProject3dObjectDocument,
  DeleteProject3dObjectDocument,
  GetProjectDocument,
  GetSceneObjectTypesDocument,
  ProjectEnvironmentType,
  UpdateProject3dObjectDocument,
  UpdateProjectDocument,
} from '@/shared/types/graphql/graphql';
import { CombinedGraphQLErrors } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import RoomDimensionsPanel from './room-dimensions-panel';
import { composeTransformFromPose, type SceneObjectPose } from './scene-object-pose';
import SceneObjectsPanel from './scene-objects-panel';
import classes from './three-d-view.module.css';

const ThreeDRoomCanvas = dynamic(async () => import('./three-d-room-canvas'), { ssr: false });

type ThreeDViewProperties = {
  projectPublicId: string;
};

type RoomDraft = {
  environmentType: ProjectEnvironmentType;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
};

type ObjectDraft = {
  transform: number[];
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
};

const ThreeDView = ({ projectPublicId }: ThreeDViewProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const { data: typesData } = useQuery(GetSceneObjectTypesDocument);
  const [updateProject] = useMutation(UpdateProjectDocument);
  const [addObject, { loading: adding }] = useMutation(AddProject3dObjectDocument, {
    refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
  });
  const [updateObject] = useMutation(UpdateProject3dObjectDocument);
  const [deleteObject] = useMutation(DeleteProject3dObjectDocument, {
    refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
  });
  const [draft, setDraft] = useState<RoomDraft | null>(null);
  const [objectDrafts, setObjectDrafts] = useState<Record<string, ObjectDraft>>({});
  const [saving, setSaving] = useState(false);
  const [selectedTypePublicId, setSelectedTypePublicId] = useState<string | null>(null);
  const [selectedObjectPublicId, setSelectedObjectPublicId] = useState<string | null>(null);
  const [scaleGizmoEnabled, setScaleGizmoEnabled] = useState(false);
  const [poseGizmoMode, setPoseGizmoMode] = useState<'translate' | 'rotate'>('translate');
  const project = data?.project;
  const types = typesData?.sceneObjectTypes ?? [];
  const typePublicId = selectedTypePublicId ?? types[0]?.publicId ?? null;

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }

  const environmentType = draft?.environmentType ?? project.environmentType;
  const roomWidth = draft?.roomWidth ?? project.roomWidth;
  const roomLength = draft?.roomLength ?? project.roomLength;
  const roomHeight = draft?.roomHeight ?? project.roomHeight;
  const objects = project.project3dObjects.map(object => {
    const objectDraft = objectDrafts[object.publicId];
    return objectDraft ? { ...object, ...objectDraft } : object;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProject({
        variables: {
          input: {
            publicId: project.publicId,
            name: project.name,
            environmentType,
            roomWidth,
            roomLength,
            roomHeight,
          },
        },
      });
      for (const [publicId, objectDraft] of Object.entries(objectDrafts)) {
        const current = objects.find(object => object.publicId === publicId);
        await updateObject({
          variables: {
            input: {
              publicId,
              transform: objectDraft.transform,
              ...(current?.sceneObjectType.isScalable
                ? { sizeX: objectDraft.sizeX, sizeY: objectDraft.sizeY, sizeZ: objectDraft.sizeZ }
                : {}),
            },
          },
        });
      }
      setDraft(null);
      setObjectDrafts({});
      notifications.show({
        color: 'green',
        title: t(globalMessages.success),
        message: t({ id: 'ProjectDetail.threeD.saved', defaultMessage: 'Environment saved' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectDetail.threeD.saveError', defaultMessage: 'Failed to save environment' }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!typePublicId) {
      return;
    }
    try {
      const result = await addObject({
        variables: {
          input: {
            projectPublicId: project.publicId,
            sceneObjectTypePublicId: typePublicId,
          },
        },
      });
      const created = result.data?.addProject3dObject.publicId;
      if (created) {
        setSelectedObjectPublicId(created);
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectDetail.threeD.addObjectError', defaultMessage: 'Failed to add object' }),
      });
    }
  };

  const handleCommit = (
    publicId: string,
    pose: { transform: number[]; sizeX: number | null; sizeY: number | null; sizeZ: number | null },
  ) => {
    setObjectDrafts(current => ({
      ...current,
      [publicId]: {
        transform: pose.transform,
        sizeX: pose.sizeX,
        sizeY: pose.sizeY,
        sizeZ: pose.sizeZ,
      },
    }));
  };

  const handleSizeChange = (axis: 'sizeX' | 'sizeY' | 'sizeZ', value: number) => {
    if (!selectedObjectPublicId) {
      return;
    }
    const current = objects.find(object => object.publicId === selectedObjectPublicId);
    if (!current) {
      return;
    }
    setObjectDrafts(existing => ({
      ...existing,
      [selectedObjectPublicId]: {
        transform: current.transform,
        sizeX: axis === 'sizeX' ? value : current.sizeX,
        sizeY: axis === 'sizeY' ? value : current.sizeY,
        sizeZ: axis === 'sizeZ' ? value : current.sizeZ,
      },
    }));
  };

  const showUpdateObjectError = (error: unknown) => {
    const nameExists =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some(graphQLError => graphQLError.extensions?.code === 'PROJECT_3D_OBJECT_NAME_EXISTS');
    notifications.show({
      color: 'red',
      title: t(globalMessages.error),
      message: nameExists
        ? t({
            id: 'ProjectDetail.threeD.nameExists',
            defaultMessage: 'That name is already used in this project',
          })
        : t({ id: 'ProjectDetail.threeD.updateObjectError', defaultMessage: 'Failed to update object' }),
    });
  };

  const handleNameChange = async (name: string) => {
    if (!selectedObjectPublicId) {
      return;
    }
    try {
      await updateObject({
        variables: {
          input: {
            publicId: selectedObjectPublicId,
            name,
          },
        },
      });
    } catch (error) {
      showUpdateObjectError(error);
    }
  };

  const handlePoseChange = (pose: SceneObjectPose) => {
    if (!selectedObjectPublicId) {
      return;
    }
    const current = objects.find(object => object.publicId === selectedObjectPublicId);
    if (!current) {
      return;
    }
    setObjectDrafts(existing => ({
      ...existing,
      [selectedObjectPublicId]: {
        transform: composeTransformFromPose(pose),
        sizeX: current.sizeX,
        sizeY: current.sizeY,
        sizeZ: current.sizeZ,
      },
    }));
  };

  const handleDelete = async () => {
    if (!selectedObjectPublicId) {
      return;
    }
    try {
      await deleteObject({ variables: { publicId: selectedObjectPublicId } });
      setObjectDrafts(existing => {
        const { [selectedObjectPublicId]: _removed, ...next } = existing;
        return next;
      });
      setSelectedObjectPublicId(null);
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectDetail.threeD.deleteObjectError', defaultMessage: 'Failed to delete object' }),
      });
    }
  };

  return (
    <Group align="stretch" wrap="nowrap" gap="md" className={classes.root}>
      <Box
        className={classes.canvas}
        tabIndex={0}
        onPointerDown={event => {
          event.currentTarget.focus();
        }}
        onKeyDown={event => {
          if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
          }
          if (event.key === 'r' || event.key === 'R') {
            event.preventDefault();
            setPoseGizmoMode('rotate');
          } else if (event.key === 't' || event.key === 'T') {
            event.preventDefault();
            setPoseGizmoMode('translate');
          }
        }}
      >
        <Text className={classes.gizmoHint} component="div">
          <div>{t({ id: 'ProjectDetail.threeD.gizmoHint.translate', defaultMessage: 'T Move' })}</div>
          <div>{t({ id: 'ProjectDetail.threeD.gizmoHint.rotate', defaultMessage: 'R Rotate' })}</div>
        </Text>
        <ThreeDRoomCanvas
          key={environmentType}
          environmentType={environmentType}
          roomWidth={roomWidth}
          roomLength={roomLength}
          roomHeight={roomHeight}
          objects={objects}
          selectedObjectPublicId={selectedObjectPublicId}
          scaleGizmoEnabled={scaleGizmoEnabled}
          poseGizmoMode={poseGizmoMode}
          onSelectObject={setSelectedObjectPublicId}
          onObjectCommit={handleCommit}
        />
      </Box>
      <Paper w={320} p="md" withBorder className={classes.panel}>
        <Stack gap="xl">
          <RoomDimensionsPanel
            environmentType={environmentType}
            width={roomWidth}
            length={roomLength}
            height={roomHeight}
            saving={saving}
            onEnvironmentTypeChange={value => {
              setDraft({ environmentType: value, roomWidth, roomLength, roomHeight });
            }}
            onWidthChange={value => {
              setDraft({ environmentType, roomWidth: value, roomLength, roomHeight });
            }}
            onLengthChange={value => {
              setDraft({ environmentType, roomWidth, roomLength: value, roomHeight });
            }}
            onHeightChange={value => {
              setDraft({ environmentType, roomWidth, roomLength, roomHeight: value });
            }}
            onSave={() => {
              void handleSave();
            }}
          />
          <SceneObjectsPanel
            types={types}
            objects={objects}
            selectedTypePublicId={typePublicId}
            selectedObjectPublicId={selectedObjectPublicId}
            scaleGizmoEnabled={scaleGizmoEnabled}
            adding={adding}
            onTypeChange={setSelectedTypePublicId}
            onAdd={() => {
              void handleAdd();
            }}
            onSelectObject={setSelectedObjectPublicId}
            onDeleteObject={() => {
              void handleDelete();
            }}
            onScaleGizmoChange={setScaleGizmoEnabled}
            onNameChange={name => {
              void handleNameChange(name);
            }}
            onPoseChange={handlePoseChange}
            onSizeChange={handleSizeChange}
          />
        </Stack>
      </Paper>
    </Group>
  );
};

export default ThreeDView;
