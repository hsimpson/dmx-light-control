'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Group, NumberInput, Select, Stack, Text, Title } from '@mantine/core';
import { decomposePose, type SceneObjectPose } from './scene-object-pose';

export type ProjectFixture3dListItem = {
  publicId: string;
  startAddress: number;
  transform: number[];
  fixture: {
    name: string;
    fixtureVendor: { name: string };
  };
};

export type ProjectFixtures3dPanelProperties = {
  fixtures: ProjectFixture3dListItem[];
  selectedFixturePublicId: string | null;
  onSelectFixture: (publicId: string | null) => void;
  onPoseChange: (pose: SceneObjectPose) => void;
};

function toFiniteNumber(value: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sortProjectFixtures(fixtures: ProjectFixture3dListItem[]): ProjectFixture3dListItem[] {
  return [...fixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );
}

function fixtureLabel(fixture: ProjectFixture3dListItem, fixtureNumber: number): string {
  return `${fixture.fixture.name} [${fixtureNumber}]`;
}

const ProjectFixtures3dPanel = ({
  fixtures,
  selectedFixturePublicId,
  onSelectFixture,
  onPoseChange,
}: ProjectFixtures3dPanelProperties) => {
  const { t } = useTranslation();
  const sortedFixtures = sortProjectFixtures(fixtures);
  const selected = fixtures.find(fixture => fixture.publicId === selectedFixturePublicId);
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
      <Title order={3}>{t({ id: 'ProjectDetail.threeD.fixturesTitle', defaultMessage: 'Fixtures' })}</Title>
      <Select
        label={t({ id: 'ProjectDetail.threeD.selectedFixture', defaultMessage: 'Selected fixture' })}
        placeholder={t({ id: 'ProjectDetail.threeD.noSelection', defaultMessage: 'None' })}
        value={selectedFixturePublicId ?? null}
        data={sortedFixtures.map((fixture, fixtureIndex) => ({
          value: fixture.publicId,
          label: fixtureLabel(fixture, fixtureIndex + 1),
        }))}
        onChange={value => {
          onSelectFixture(value);
        }}
        clearable
        clearButtonProps={{
          'aria-label': t({ id: 'ProjectDetail.threeD.clearSelection', defaultMessage: 'Clear selection' }),
        }}
      />
      {selected && pose ? (
        <>
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
        </>
      ) : null}
    </Stack>
  );
};

export default ProjectFixtures3dPanel;
