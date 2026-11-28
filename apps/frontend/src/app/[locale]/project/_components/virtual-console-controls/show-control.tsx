'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { GetShowsDocument } from '@/shared/types/graphql/graphql';
import { skipToken, useQuery } from '@apollo/client/react';
import { Stack, Text } from '@mantine/core';
import { useParams } from 'next/navigation';
import ShowTransport from '../show-manager/show-transport';
import { controlFontStyle } from '../virtual-console-fonts';
import type { VirtualConsoleControlProperties } from './virtual-console-control-properties';

/** An audio-player style transport for one show; it plays on the backend, so every open console follows it. */
const ShowControl = ({ control, mode, selected = false }: Omit<VirtualConsoleControlProperties, 'onPlayValue'>) => {
  const { t } = useTranslation();
  const { publicId: projectPublicId } = useParams<{ publicId?: string }>();
  const { data } = useQuery(
    GetShowsDocument,
    projectPublicId && control.showPublicId ? { variables: { projectPublicId } } : skipToken,
  );
  const show = data?.shows.find(candidate => candidate.publicId === control.showPublicId);

  return (
    <Stack
      gap={4}
      p="xs"
      h="100%"
      style={{
        backgroundColor: control.backgroundColor,
        color: control.foregroundColor,
        borderRadius: 4,
        // Lets the transport size itself from the control's height.
        containerType: 'size',
        outline: selected ? '2px solid var(--mantine-color-yellow-filled)' : undefined,
        // Edit mode moves and resizes the control; its buttons must not catch the pointer.
        pointerEvents: mode === 'edit' ? 'none' : undefined,
        ...controlFontStyle(control),
      }}
      data-testid="virtual-console-show"
    >
      <Text inherit truncate>
        {control.label}
      </Text>
      {control.showPublicId ? (
        <ShowTransport
          showPublicId={control.showPublicId}
          durationMs={show?.durationMs ?? 0}
          cues={show?.cues}
          layout="console"
        />
      ) : (
        <Text size="xs" c="dimmed">
          {t({ id: 'ProjectDetail.virtualConsole.noShow', defaultMessage: 'No show selected' })}
        </Text>
      )}
    </Stack>
  );
};

export default ShowControl;
