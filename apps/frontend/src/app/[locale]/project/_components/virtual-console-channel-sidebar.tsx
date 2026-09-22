'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Accordion, Badge, Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import type { VirtualConsoleChannelBinding, VirtualConsoleControl } from './virtual-console-document';
import classes from './virtual-console-view.module.css';

export type VirtualConsoleAssignableFixture = {
  publicId: string;
  startAddress: number;
  fixture: { name: string; fixtureVendor: { name: string } };
  channelMode: {
    name: string;
    fixtureChannelAssignments: {
      publicId: string;
      channelNumber: number;
      fixtureChannelDefinition: { name: string; preset: FixtureChannelPreset };
    }[];
  };
};

type VirtualConsoleChannelSidebarProperties = {
  control: VirtualConsoleControl;
  fixtures: VirtualConsoleAssignableFixture[];
  onPatch: (patch: Partial<VirtualConsoleControl>) => void;
};

const bindingKey = (binding: VirtualConsoleChannelBinding) =>
  `${binding.projectFixturePublicId}:${binding.channelAssignmentPublicId}`;

const VirtualConsoleChannelSidebar = ({ control, fixtures, onPatch }: VirtualConsoleChannelSidebarProperties) => {
  const { t } = useTranslation();
  const bindings = control.channelBindings ?? [];
  const known = new Set(
    fixtures.flatMap(fixture =>
      fixture.channelMode.fixtureChannelAssignments.map(assignment =>
        bindingKey({ projectFixturePublicId: fixture.publicId, channelAssignmentPublicId: assignment.publicId }),
      ),
    ),
  );
  const unavailable = bindings.filter(binding => !known.has(bindingKey(binding)));
  const sortedFixtures = [...fixtures].sort(
    (left, right) => left.startAddress - right.startAddress || left.publicId.localeCompare(right.publicId),
  );

  const writeBindings = (next: VirtualConsoleChannelBinding[]) => {
    onPatch({ channelBindings: next.length > 0 ? next : undefined });
  };

  const toggle = (binding: VirtualConsoleChannelBinding, checked: boolean) => {
    const without = bindings.filter(current => bindingKey(current) !== bindingKey(binding));
    writeBindings(checked ? [...without, binding] : without);
  };

  return (
    <Paper className={classes.panel} data-testid="virtual-console-channel-sidebar" p="md" withBorder>
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          {t({ id: 'ProjectDetail.virtualConsole.channels', defaultMessage: 'Channels' })}
        </Text>
        <Button
          disabled={bindings.length === 0}
          variant="light"
          onClick={() => {
            writeBindings([]);
          }}
        >
          {t({ id: 'ProjectDetail.virtualConsole.clearAssignments', defaultMessage: 'Clear assignments' })}
        </Button>
        {sortedFixtures.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t({ id: 'ProjectDetail.virtualConsole.channelsEmpty', defaultMessage: 'No patched fixtures' })}
          </Text>
        ) : (
          <Accordion multiple transitionDuration={0} variant="contained">
            {sortedFixtures.map((fixture, fixtureIndex) => {
              const assignedCount = fixture.channelMode.fixtureChannelAssignments.filter(assignment =>
                bindings.some(
                  current =>
                    bindingKey(current) ===
                    bindingKey({
                      projectFixturePublicId: fixture.publicId,
                      channelAssignmentPublicId: assignment.publicId,
                    }),
                ),
              ).length;
              return (
                <Accordion.Item key={fixture.publicId} value={fixture.publicId}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" fw={600}>
                        {fixture.fixture.name} [{fixtureIndex + 1}]
                      </Text>
                      <Badge variant="light">
                        {assignedCount}/{fixture.channelMode.fixtureChannelAssignments.length}
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={4}>
                      {[...fixture.channelMode.fixtureChannelAssignments]
                        .sort((left, right) => left.channelNumber - right.channelNumber)
                        .map(assignment => {
                          const binding = {
                            projectFixturePublicId: fixture.publicId,
                            channelAssignmentPublicId: assignment.publicId,
                          };
                          const absolute = fixture.startAddress + assignment.channelNumber - 1;
                          return (
                            <Checkbox
                              key={assignment.publicId}
                              checked={bindings.some(current => bindingKey(current) === bindingKey(binding))}
                              label={
                                <Group gap={6} wrap="nowrap">
                                  <span data-testid={`virtual-console-channel-icon-${assignment.publicId}`}>
                                    <FixturePresetIcon preset={assignment.fixtureChannelDefinition.preset} />
                                  </span>
                                  {`${absolute} · ${assignment.fixtureChannelDefinition.name}`}
                                </Group>
                              }
                              onChange={event => {
                                toggle(binding, event.currentTarget.checked);
                              }}
                            />
                          );
                        })}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
        {unavailable.map(binding => (
          <Group key={bindingKey(binding)} justify="space-between">
            <Text size="xs" c="dimmed">
              {t({ id: 'ProjectDetail.virtualConsole.channelUnavailable', defaultMessage: 'Unavailable' })}
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => {
                writeBindings(bindings.filter(current => bindingKey(current) !== bindingKey(binding)));
              }}
            >
              {t({ id: 'ProjectDetail.virtualConsole.channelRemove', defaultMessage: 'Remove' })}
            </Button>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
};

export default VirtualConsoleChannelSidebar;
