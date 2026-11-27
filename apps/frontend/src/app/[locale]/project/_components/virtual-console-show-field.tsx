'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { GetShowsDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Select } from '@mantine/core';

type VirtualConsoleShowFieldProperties = {
  projectPublicId: string;
  showPublicId: string | undefined;
  onChange: (showPublicId: string | undefined) => void;
};

/** Picks the show a show control plays. */
const VirtualConsoleShowField = ({ projectPublicId, showPublicId, onChange }: VirtualConsoleShowFieldProperties) => {
  const { t } = useTranslation();
  const { data } = useQuery(GetShowsDocument, { variables: { projectPublicId } });

  return (
    <Select
      clearable
      label={t({ id: 'ProjectDetail.virtualConsole.show', defaultMessage: 'Show' })}
      placeholder={t({ id: 'ProjectDetail.virtualConsole.noShow', defaultMessage: 'No show selected' })}
      data={(data?.shows ?? []).map(show => ({ value: show.publicId, label: show.name }))}
      value={showPublicId ?? null}
      onChange={value => {
        onChange(value ?? undefined);
      }}
    />
  );
};

export default VirtualConsoleShowField;
