'use client';

import { FixturePresetIcon } from '@/lib/fixtures/fixture-preset-icon';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { Accordion, Badge, Button, Checkbox, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { useRef } from 'react';
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

type VirtualConsoleFunctionOption = {
  publicId: string;
  name: string;
};

type BindingPatch = Partial<Pick<VirtualConsoleControl, 'channelBindings' | 'functionPublicId'>>;

type VirtualConsoleChannelSidebarProperties = {
  /** A button or slider, or an audio bar (no `type`), whose bindings are edited. */
  control: BindingPatch & { type?: VirtualConsoleControl['type'] };
  /** Set for audio bars: their mode already decides between channels and a function. */
  fixedKind?: 'channels' | 'function';
  fixtures: VirtualConsoleAssignableFixture[];
  functions?: VirtualConsoleFunctionOption[];
  onPatch: (patch: BindingPatch) => void;
};

const emptyFunctions: VirtualConsoleFunctionOption[] = [];

const bindingKey = (binding: VirtualConsoleChannelBinding) =>
  `${binding.projectFixturePublicId}:${binding.channelAssignmentPublicId}`;

const VirtualConsoleChannelSidebar = ({
  control,
  fixedKind,
  fixtures,
  functions = emptyFunctions,
  onPatch,
}: VirtualConsoleChannelSidebarProperties) => {
  const { t } = useTranslation();
  const functionSelect = useRef<HTMLInputElement>(null);
  const choosesKind = fixedKind === undefined && control.type === 'button';
  const bindsFunction = fixedKind === 'function' || (choosesKind && Boolean(control.functionPublicId));
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
        {choosesKind ? (
          <Select
            allowDeselect={false}
            label={t({ id: 'ProjectDetail.virtualConsole.bindingKind', defaultMessage: 'Binding' })}
            data={[
              {
                value: 'channels',
                label: t({ id: 'ProjectDetail.virtualConsole.bindChannels', defaultMessage: 'Channels' }),
              },
              {
                value: 'function',
                label: t({ id: 'ProjectDetail.virtualConsole.bindFunction', defaultMessage: 'Function' }),
              },
            ]}
            value={control.functionPublicId ? 'function' : 'channels'}
            onChange={value => {
              if (value === 'function') {
                onPatch({
                  channelBindings: undefined,
                  functionPublicId: functions[0]?.publicId,
                });
                return;
              }
              onPatch({ functionPublicId: undefined });
            }}
          />
        ) : null}
        {bindsFunction ? (
          <Select
            allowDeselect={false}
            label={t({ id: 'ProjectDetail.virtualConsole.function', defaultMessage: 'Function' })}
            clearable={fixedKind === 'function'}
            clearButtonProps={{
              // Mantine hides it from assistive tech, but here it is the only way to unbind the function.
              'aria-hidden': false,
              'aria-label': t({ id: 'ProjectDetail.virtualConsole.clearFunction', defaultMessage: 'Clear function' }),
              tabIndex: 0,
              // Delete here must not reach the editor's window shortcut, which removes the whole control.
              onKeyDown: event => {
                event.stopPropagation();
              },
            }}
            ref={functionSelect}
            onClear={() => {
              // The clear button unmounts; without focus, the next Delete would remove the control.
              functionSelect.current?.focus();
            }}
            data={functions.map(fn => ({ value: fn.publicId, label: fn.name }))}
            value={control.functionPublicId ?? null}
            onChange={value => {
              if (value) {
                onPatch({ functionPublicId: value, channelBindings: undefined });
              } else {
                onPatch({ functionPublicId: undefined });
              }
            }}
          />
        ) : null}
        {bindsFunction ? null : (
          <>
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
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default VirtualConsoleChannelSidebar;
