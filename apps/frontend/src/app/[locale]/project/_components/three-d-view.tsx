'use client';

import { Loading } from '@/components/loading';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetProjectDocument, UpdateProjectDocument } from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Group, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import classes from './three-d-view.module.css';
import RoomDimensionsPanel from './room-dimensions-panel';

const ThreeDRoomCanvas = dynamic(async () => import('./three-d-room-canvas'), { ssr: false });

type ThreeDViewProperties = {
  projectPublicId: string;
};

type RoomDraft = {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
};

const ThreeDView = ({ projectPublicId }: ThreeDViewProperties) => {
  const { t } = useTranslation();
  const { data, loading } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const [updateProject, { loading: saving }] = useMutation(UpdateProjectDocument);
  const [draft, setDraft] = useState<RoomDraft | null>(null);
  const project = data?.project;

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }

  const roomWidth = draft?.roomWidth ?? project.roomWidth;
  const roomLength = draft?.roomLength ?? project.roomLength;
  const roomHeight = draft?.roomHeight ?? project.roomHeight;

  const handleSave = async () => {
    try {
      await updateProject({
        variables: {
          input: {
            publicId: project.publicId,
            name: project.name,
            roomWidth,
            roomLength,
            roomHeight,
          },
        },
      });
      notifications.show({
        color: 'green',
        title: t(globalMessages.success),
        message: t({ id: 'ProjectDetail.threeD.saved', defaultMessage: 'Room dimensions saved' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectDetail.threeD.saveError', defaultMessage: 'Failed to save room dimensions' }),
      });
    }
  };

  return (
    <Group align="stretch" wrap="nowrap" gap="md" className={classes.root}>
      <Box className={classes.canvas}>
        <ThreeDRoomCanvas roomWidth={roomWidth} roomLength={roomLength} roomHeight={roomHeight} />
      </Box>
      <Paper w={280} p="md" withBorder className={classes.panel}>
        <RoomDimensionsPanel
          width={roomWidth}
          length={roomLength}
          height={roomHeight}
          saving={saving}
          onWidthChange={value => {
            setDraft({ roomWidth: value, roomLength, roomHeight });
          }}
          onLengthChange={value => {
            setDraft({ roomWidth, roomLength: value, roomHeight });
          }}
          onHeightChange={value => {
            setDraft({ roomWidth, roomLength, roomHeight: value });
          }}
          onSave={() => {
            void handleSave();
          }}
        />
      </Paper>
    </Group>
  );
};

export default ThreeDView;
