'use client';

import { useDmxStore } from '@/lib/dmx/dmx-store';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActivateProjectDocument } from '@/shared/types/graphql/graphql';
import { useMutation } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';

/**
 * Tells the backend which project is loaded so it connects that project's I/O devices.
 * Re-runs when the DMX socket reconnects, because a restarted backend forgets the active project.
 */
export function useActivateProject(publicId: string | undefined): void {
  const { t } = useTranslation();
  const [activateProject] = useMutation(ActivateProjectDocument);
  const socketOpen = useDmxStore(state => state.status === 'open');

  useEffect(() => {
    if (!publicId) {
      return;
    }
    activateProject({ variables: { publicId } }).catch(() => {
      notifications.show({
        color: 'red',
        message: t({
          id: 'ProjectDetail.io.activateFailed',
          defaultMessage: 'Could not connect the input/output devices of this project.',
        }),
      });
    });
  }, [publicId, socketOpen, activateProject, t]);
}
