'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { SceneObjectGeometryKind } from '@/shared/types/graphql/graphql';
import { Button, Group, NumberInput, Select, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import { ROOM_DIMENSION_MAX, ROOM_DIMENSION_MIN } from './room-dimensions-panel';
import { decomposePose, type SceneObjectPose } from './scene-object-pose';

export type SceneObjectTypeOption = {
  publicId: string;
  name: string;
  isScalable: boolean;
};

export type SceneObjectListItem = {
  publicId: string;
  name: string;
  transform: number[];
  sizeX: number | null;
  sizeY: number | null;
  sizeZ: number | null;
  sceneObjectType: {
    publicId: string;
    name: string;
    geometryKind: SceneObjectGeometryKind;
    isScalable: boolean;
  };
};

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export type SceneObjectsPanelProperties = {
  types: SceneObjectTypeOption[];
  objects: SceneObjectListItem[];
  selectedTypePublicId: string | null;
  selectedObjectPublicId: string | null;
  scaleGizmoEnabled: boolean;
  adding: boolean;
  onTypeChange: (publicId: string) => void;
  onAdd: () => void;
  onSelectObject: (publicId: string | null) => void;
  onDeleteObject: () => void;
  onScaleGizmoChange: (enabled: boolean) => void;
  onNameChange: (name: string) => void;
  onPoseChange: (pose: SceneObjectPose) => void;
  onSizeChange: (axis: 'sizeX' | 'sizeY' | 'sizeZ', value: number) => void;
};

function toFiniteNumber(value: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const SceneObjectsPanel = ({
  types,
  objects,
  selectedTypePublicId,
  selectedObjectPublicId,
  scaleGizmoEnabled,
  adding,
  onTypeChange,
  onAdd,
  onSelectObject,
  onDeleteObject,
  onScaleGizmoChange,
  onNameChange,
  onPoseChange,
  onSizeChange,
}: SceneObjectsPanelProperties) => {
  const { t } = useTranslation();
  const selected = objects.find(object => object.publicId === selectedObjectPublicId);
  const pose = selected ? decomposePose(selected.transform) : null;
  const positionLabel = t({ id: 'ProjectDetail.threeD.position', defaultMessage: 'Position' });
  const rotationLabel = t({ id: 'ProjectDetail.threeD.rotation', defaultMessage: 'Rotation' });

  const commitPoseAxis = (axis: keyof SceneObjectPose, value: number) => {
    if (!pose) {
      return;
    }
    onPoseChange({ ...pose, [axis]: value });
  };

  return (
    <Stack gap="md">
      <Title order={3}>{t({ id: 'ProjectDetail.threeD.objectsTitle', defaultMessage: 'Scene objects' })}</Title>
      <Select
        label={t({ id: 'ProjectDetail.threeD.objectType', defaultMessage: 'Object type' })}
        allowDeselect={false}
        value={selectedTypePublicId ?? undefined}
        onChange={value => {
          if (value) {
            onTypeChange(value);
          }
        }}
        data={types.map(type => ({ value: type.publicId, label: type.name }))}
      />
      <Button onClick={onAdd} loading={adding} disabled={!selectedTypePublicId}>
        {t({ id: 'ProjectDetail.threeD.addObject', defaultMessage: 'Add to scene' })}
      </Button>
      <Select
        label={t({ id: 'ProjectDetail.threeD.selectedObject', defaultMessage: 'Selected object' })}
        placeholder={t({ id: 'ProjectDetail.threeD.noSelection', defaultMessage: 'None' })}
        value={selectedObjectPublicId ?? null}
        data={objects.map(object => ({
          value: object.publicId,
          label: object.name,
        }))}
        onChange={value => {
          onSelectObject(value);
        }}
        clearable
        clearButtonProps={{
          'aria-label': t({ id: 'ProjectDetail.threeD.clearSelection', defaultMessage: 'Clear selection' }),
        }}
      />
      {selected && pose ? (
        <>
          <TextInput
            key={selected.publicId}
            label={t({ id: 'ProjectDetail.threeD.objectName', defaultMessage: 'Name' })}
            defaultValue={selected.name}
            onBlur={event => {
              const next = event.currentTarget.value;
              if (next !== selected.name) {
                onNameChange(next);
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <Text size="sm" fw={500}>
            {positionLabel}
          </Text>
          <Group grow>
            <NumberInput
              label={`${positionLabel} ${t({ id: 'ProjectDetail.threeD.positionX', defaultMessage: 'X' })}`}
              suffix=" m"
              step={0.1}
              decimalScale={2}
              value={pose.positionX}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('positionX', next);
                }
              }}
            />
            <NumberInput
              label={`${positionLabel} ${t({ id: 'ProjectDetail.threeD.positionY', defaultMessage: 'Y' })}`}
              suffix=" m"
              step={0.1}
              decimalScale={2}
              value={pose.positionY}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('positionY', next);
                }
              }}
            />
            <NumberInput
              label={`${positionLabel} ${t({ id: 'ProjectDetail.threeD.positionZ', defaultMessage: 'Z' })}`}
              suffix=" m"
              step={0.1}
              decimalScale={2}
              value={pose.positionZ}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('positionZ', next);
                }
              }}
            />
          </Group>
          <Text size="sm" fw={500}>
            {rotationLabel}
          </Text>
          <Group grow>
            <NumberInput
              label={`${rotationLabel} ${t({ id: 'ProjectDetail.threeD.rotationX', defaultMessage: 'X' })}`}
              suffix="°"
              step={1}
              decimalScale={1}
              value={pose.rotationX}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('rotationX', next);
                }
              }}
            />
            <NumberInput
              label={`${rotationLabel} ${t({ id: 'ProjectDetail.threeD.rotationY', defaultMessage: 'Y' })}`}
              suffix="°"
              step={1}
              decimalScale={1}
              value={pose.rotationY}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('rotationY', next);
                }
              }}
            />
            <NumberInput
              label={`${rotationLabel} ${t({ id: 'ProjectDetail.threeD.rotationZ', defaultMessage: 'Z' })}`}
              suffix="°"
              step={1}
              decimalScale={1}
              value={pose.rotationZ}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  commitPoseAxis('rotationZ', next);
                }
              }}
            />
          </Group>
          {selected.sceneObjectType.isScalable ? (
            <>
              <Switch
                label={t({ id: 'ProjectDetail.threeD.gizmo.scale', defaultMessage: 'Scale' })}
                checked={scaleGizmoEnabled}
                onChange={event => {
                  onScaleGizmoChange(event.currentTarget.checked);
                }}
              />
              <Group grow>
                <NumberInput
                  label={t({ id: 'ProjectDetail.threeD.width', defaultMessage: 'Width' })}
                  suffix=" m"
                  min={ROOM_DIMENSION_MIN}
                  max={ROOM_DIMENSION_MAX}
                  step={0.1}
                  decimalScale={2}
                  value={selected.sizeX ?? undefined}
                  onChange={value => {
                    const next = toFiniteNumber(value);
                    if (next !== undefined) {
                      onSizeChange('sizeX', next);
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
                  value={selected.sizeZ ?? undefined}
                  onChange={value => {
                    const next = toFiniteNumber(value);
                    if (next !== undefined) {
                      onSizeChange('sizeZ', next);
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
                  value={selected.sizeY ?? undefined}
                  onChange={value => {
                    const next = toFiniteNumber(value);
                    if (next !== undefined) {
                      onSizeChange('sizeY', next);
                    }
                  }}
                />
              </Group>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              {t({ id: 'ProjectDetail.threeD.fixedSize', defaultMessage: 'This object has a fixed size.' })}
            </Text>
          )}
          <Button color="red" variant="light" onClick={onDeleteObject}>
            {t({ id: 'ProjectDetail.threeD.deleteObject', defaultMessage: 'Delete' })}
          </Button>
        </>
      ) : null}
    </Stack>
  );
};

export default SceneObjectsPanel;
