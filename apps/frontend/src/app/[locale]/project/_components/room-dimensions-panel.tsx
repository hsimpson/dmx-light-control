'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ProjectEnvironmentType } from '@/shared/types/graphql/graphql';
import { Button, NumberInput, Select, Stack, Title } from '@mantine/core';

export const ROOM_DIMENSION_MIN = 0.1;
export const ROOM_DIMENSION_MAX = 200;

export type RoomDimensionsPanelProperties = {
  environmentType: ProjectEnvironmentType;
  width: number;
  length: number;
  height: number;
  saving: boolean;
  onEnvironmentTypeChange: (value: ProjectEnvironmentType) => void;
  onWidthChange: (value: number) => void;
  onLengthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onSave: () => void;
};

function toFiniteNumber(value: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const RoomDimensionsPanel = ({
  environmentType,
  width,
  length,
  height,
  saving,
  onEnvironmentTypeChange,
  onWidthChange,
  onLengthChange,
  onHeightChange,
  onSave,
}: RoomDimensionsPanelProperties) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Title order={3}>{t({ id: 'ProjectDetail.threeD.panelTitle', defaultMessage: 'Environment' })}</Title>
      <Select
        label={t({ id: 'ProjectDetail.threeD.environment', defaultMessage: 'Environment' })}
        allowDeselect={false}
        value={environmentType}
        onChange={value => {
          if (value === ProjectEnvironmentType.SimpleGround || value === ProjectEnvironmentType.Room) {
            onEnvironmentTypeChange(value);
          }
        }}
        data={[
          {
            value: ProjectEnvironmentType.SimpleGround,
            label: t({ id: 'ProjectDetail.threeD.environment.simpleGround', defaultMessage: 'Simple ground' }),
          },
          {
            value: ProjectEnvironmentType.Room,
            label: t({ id: 'ProjectDetail.threeD.environment.room', defaultMessage: 'Room' }),
          },
        ]}
      />
      <NumberInput
        label={t({ id: 'ProjectDetail.threeD.width', defaultMessage: 'Width' })}
        suffix=" m"
        min={ROOM_DIMENSION_MIN}
        max={ROOM_DIMENSION_MAX}
        step={0.1}
        decimalScale={2}
        value={width}
        onChange={value => {
          const next = toFiniteNumber(value);
          if (next !== undefined) {
            onWidthChange(next);
          }
        }}
      />
      <NumberInput
        label={t({ id: 'ProjectDetail.threeD.length', defaultMessage: 'Length' })}
        suffix=" m"
        min={ROOM_DIMENSION_MIN}
        max={ROOM_DIMENSION_MAX}
        step={0.1}
        decimalScale={2}
        value={length}
        onChange={value => {
          const next = toFiniteNumber(value);
          if (next !== undefined) {
            onLengthChange(next);
          }
        }}
      />
      <NumberInput
        label={t({ id: 'ProjectDetail.threeD.height', defaultMessage: 'Height' })}
        suffix=" m"
        min={ROOM_DIMENSION_MIN}
        max={ROOM_DIMENSION_MAX}
        step={0.1}
        decimalScale={2}
        value={height}
        onChange={value => {
          const next = toFiniteNumber(value);
          if (next !== undefined) {
            onHeightChange(next);
          }
        }}
      />
      <Button onClick={onSave} loading={saving}>
        {t(globalMessages.save)}
      </Button>
    </Stack>
  );
};

export default RoomDimensionsPanel;
