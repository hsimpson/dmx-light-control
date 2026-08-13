'use client';

import SelectableList from '@/components/selectable-list/selectable-list';
import { useTranslation } from '@/lib/i18n/use-translation';
import { FixtureChannelDefinition, FixtureChannelMode } from '@/shared/types/fixtures';
import { Flex, Select, Text } from '@mantine/core';
import { useState } from 'react';
import FixtureChannelDefinitionItem from './fixture-channel-definition-item';

export type EditorChannelAssignment = {
  clientKey: string;
  publicId?: string;
  channelNumber: number;
  fixtureChannelDefinition: FixtureChannelDefinition;
};

export type EditorChannelMode = {
  clientKey: string;
  publicId?: string;
  name: string;
  order: number;
  fixtureChannelAssignments: EditorChannelAssignment[];
};

export type ChannelModeSaveInput = {
  publicId?: string;
  name: string;
  assignments: { channelDefinitionPublicId: string }[];
};

type FixtureChannelModesProps = {
  channelModes: EditorChannelMode[];
  persistedChannelDefinitions: FixtureChannelDefinition[];
  onChannelModesChange: (channelModes: EditorChannelMode[]) => void;
};

export const toEditorChannelModes = (fixtureChannelModes: FixtureChannelMode[]): EditorChannelMode[] =>
  [...fixtureChannelModes]
    .sort((a, b) => a.order - b.order)
    .map(mode => ({
      clientKey: mode.publicId,
      publicId: mode.publicId,
      name: mode.name,
      order: mode.order,
      fixtureChannelAssignments: [...mode.fixtureChannelAssignments]
        .sort((a, b) => a.channelNumber - b.channelNumber)
        .map(assignment => ({
          clientKey: assignment.publicId,
          publicId: assignment.publicId,
          channelNumber: assignment.channelNumber,
          fixtureChannelDefinition: assignment.fixtureChannelDefinition,
        })),
    }));

export const toChannelModeSaveInputs = (channelModes: EditorChannelMode[]): ChannelModeSaveInput[] =>
  channelModes.map(mode => ({
    ...(mode.publicId ? { publicId: mode.publicId } : {}),
    name: mode.name,
    assignments: mode.fixtureChannelAssignments.map(assignment => ({
      channelDefinitionPublicId: assignment.fixtureChannelDefinition.publicId,
    })),
  }));

const reindexModes = (modes: EditorChannelMode[]): EditorChannelMode[] =>
  modes.map((mode, index) => ({ ...mode, order: index }));

const reindexAssignments = (assignments: EditorChannelAssignment[]): EditorChannelAssignment[] =>
  assignments.map((assignment, index) => ({ ...assignment, channelNumber: index + 1 }));

const FixtureChannelModes = ({
  channelModes,
  persistedChannelDefinitions,
  onChannelModesChange,
}: FixtureChannelModesProps) => {
  const { t } = useTranslation();
  const [selectedName, setSelectedName] = useState(channelModes[0]?.name);
  const [assignmentPickerKey, setAssignmentPickerKey] = useState(0);
  const selectedChannelMode = channelModes.find(mode => mode.name === selectedName) ?? channelModes[0];

  const handleSelectedChannelModeChange = (item?: EditorChannelMode) => {
    setSelectedName(item?.name);
  };

  const handleChannelModeAdd = (name: string) => {
    const newChannelMode: EditorChannelMode = {
      clientKey: crypto.randomUUID(),
      name,
      order: channelModes.length,
      fixtureChannelAssignments: [],
    };
    onChannelModesChange([...channelModes, newChannelMode]);
    setSelectedName(name);
  };

  const handleChannelModeRemove = (item: EditorChannelMode) => {
    onChannelModesChange(reindexModes(channelModes.filter(mode => mode.clientKey !== item.clientKey)));
  };

  const handleChannelModeReorder = (reordered: EditorChannelMode[]) => {
    onChannelModesChange(reindexModes(reordered));
  };

  const updateSelectedAssignments = (assignments: EditorChannelAssignment[]) => {
    if (!selectedChannelMode) {
      return;
    }
    onChannelModesChange(
      channelModes.map(mode =>
        mode.clientKey === selectedChannelMode.clientKey
          ? { ...mode, fixtureChannelAssignments: reindexAssignments(assignments) }
          : mode,
      ),
    );
  };

  const handleAssignmentAdd = (definitionPublicId: string | null) => {
    if (!definitionPublicId || !selectedChannelMode) {
      return;
    }
    const definition = persistedChannelDefinitions.find(item => item.publicId === definitionPublicId);
    if (!definition) {
      return;
    }
    updateSelectedAssignments([
      ...selectedChannelMode.fixtureChannelAssignments,
      {
        clientKey: crypto.randomUUID(),
        channelNumber: selectedChannelMode.fixtureChannelAssignments.length + 1,
        fixtureChannelDefinition: definition,
      },
    ]);
    setAssignmentPickerKey(key => key + 1);
  };

  const handleAssignmentRemove = (item: EditorChannelAssignment) => {
    if (!selectedChannelMode) {
      return;
    }
    updateSelectedAssignments(
      selectedChannelMode.fixtureChannelAssignments.filter(assignment => assignment.clientKey !== item.clientKey),
    );
  };

  const handleAssignmentReorder = (reordered: EditorChannelAssignment[]) => {
    updateSelectedAssignments(reordered);
  };

  return (
    <Flex direction="row" gap="xl">
      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelModes.listTitle',
            defaultMessage: 'Channel Modes',
          })}
        </Text>
        <SelectableList
          addNewItem
          addNewItemPlaceholder={t({
            id: 'FixtureChannelModes.addNewItemPlaceholder',
            defaultMessage: 'Add new channel mode',
          })}
          items={channelModes}
          accessor="name"
          keyAccessor="clientKey"
          selectedItem={selectedChannelMode}
          onSelectedItemChange={handleSelectedChannelModeChange}
          onItemAdd={handleChannelModeAdd}
          onItemRemove={handleChannelModeRemove}
          onItemReorder={handleChannelModeReorder}
        />
      </Flex>
      <Flex direction="column" gap="md">
        <Text size="md">
          {t({
            id: 'FixtureChannelModes.assignmentsListTitle',
            defaultMessage: 'Channel mode assignments',
          })}
        </Text>
        <Select
          key={assignmentPickerKey}
          searchable
          disabled={!selectedChannelMode}
          placeholder={t({
            id: 'FixtureChannelModes.addAssignmentPlaceholder',
            defaultMessage: 'Assign a channel definition',
          })}
          data={persistedChannelDefinitions.map(definition => ({
            value: definition.publicId,
            label: definition.name,
          }))}
          value={null}
          onChange={handleAssignmentAdd}
        />
        <SelectableList
          items={selectedChannelMode?.fixtureChannelAssignments ?? []}
          accessor="clientKey"
          keyAccessor="clientKey"
          itemRenderer={item => (
            <Flex direction="row" align="center" gap="sm">
              <Text size="sm" w={24}>
                {item.channelNumber}
              </Text>
              <FixtureChannelDefinitionItem channelDefinition={item.fixtureChannelDefinition} />
            </Flex>
          )}
          onItemRemove={selectedChannelMode ? handleAssignmentRemove : undefined}
          onItemReorder={selectedChannelMode ? handleAssignmentReorder : undefined}
        />
      </Flex>
    </Flex>
  );
};

export default FixtureChannelModes;
