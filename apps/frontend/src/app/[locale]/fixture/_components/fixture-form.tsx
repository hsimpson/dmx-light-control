'use client';

import { Loading } from '@/components/loading';
import { globalMessages } from '@/lib/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  FixtureChannelPreset,
  GetFixtureDocument,
  GetFixturesQuery,
  GetVendorsDocument,
} from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import {
  Button,
  Chip,
  Combobox,
  Flex,
  InputBase,
  List,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import {
  ApertureIcon,
  LightbulbIcon,
  PencilIcon,
  RectangleIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { z } from 'zod/v4';

type FixtureFormProps = {
  fixtureId?: string;
};

type ChannelAssignment =
  GetFixturesQuery['fixtures'][number]['channelAssignments'];
type Channel = ChannelAssignment[number]['channels'][number];

const getChannelsForMode = (
  channelMode: number,
  channelAssignments: ChannelAssignment,
): Channel[] => {
  const assignment = channelAssignments.find(
    (a) => a.channelMode === channelMode,
  );
  return assignment?.channels ?? [];
};

const getChannelItem = (channel: Channel) => {
  const size = 36;
  let icon: React.ReactNode = null;
  let color = 'gray';
  let type: 'color' | 'dimmer' | 'shutter' = 'color';

  switch (channel.preset) {
    case FixtureChannelPreset.IntensityRed:
      color = 'red';
      break;
    case FixtureChannelPreset.IntensityGreen:
      color = 'green';
      break;
    case FixtureChannelPreset.IntensityBlue:
      color = 'blue';
      break;
    case FixtureChannelPreset.IntensityWhite:
      color = 'white';
      break;
    case FixtureChannelPreset.IntensityAmber:
      color = 'orange';
      break;
    case FixtureChannelPreset.IntensityUv:
      color = 'purple';
      break;
    case FixtureChannelPreset.IntensityDimmer:
    case FixtureChannelPreset.IntensityMasterDimmer:
      type = 'dimmer';
      break;
    case FixtureChannelPreset.ShutterStrobeFastSlow:
    case FixtureChannelPreset.ShutterStrobeSlowFast:
      type = 'shutter';
      break;
    case FixtureChannelPreset.Custom:
      icon = <PencilIcon size={size} weight="duotone" color={color} />;
      break;
  }

  switch (type) {
    case 'color':
      icon = <RectangleIcon size={size} weight="duotone" color={color} />;
      break;
    case 'dimmer':
      icon = <LightbulbIcon size={size} weight="duotone" color="yellow" />;
      break;
    case 'shutter':
      icon = <ApertureIcon size={size} weight="duotone" color="yellow" />;
      break;
  }
  return (
    <List.Item key={channel.channelNumber} icon={icon}>
      {channel.channelNumber}: {channel.preset}
    </List.Item>
  );
};

const FixtureForm = ({ fixtureId }: FixtureFormProps) => {
  const { t } = useTranslation();
  const { data: fixtureData, loading: fixtureLoading } = useQuery(
    GetFixtureDocument,
    {
      variables: { fixtureId: fixtureId ?? '' },
      skip: !fixtureId,
    },
  );

  const { data: vendorsData, loading: vendorsLoading } =
    useQuery(GetVendorsDocument);

  const schema = z.object({
    fixtureName: z.string().min(3, {
      message: t({
        id: 'FixtureForm.validation.fixtureName',
        defaultMessage: 'Fixture name must be at least 3 characters long',
      }),
    }),
    vendor: z.string().min(3, {
      message: t({
        id: 'FixtureForm.validation.vendor',
        defaultMessage: 'Vendor name must be at least 3 characters long',
      }),
    }),
  });
  type FixtureFormValues = z.infer<typeof schema>;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
    },
    onDropdownOpen: (eventSource) => {
      if (eventSource === 'keyboard') {
        combobox.selectActiveOption();
      } else {
        combobox.updateSelectedOptionIndex('active');
      }
    },
  });

  const [comboBoxData, setComboBoxData] = useState<string[]>([]);
  const [comboBoxValue, setComboBoxValue] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelMode, setChannelMode] = useState<number | null>(null);

  useEffect(() => {
    if (vendorsData?.vendors) {
      const vendorNames = vendorsData.vendors.map((vendor) => vendor.name);
      setComboBoxData(vendorNames);
    }
  }, [vendorsData?.vendors]);

  const exactOptionMatch = comboBoxData.some((item) => item === search);
  const filteredOptions = exactOptionMatch
    ? comboBoxData
    : comboBoxData.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase().trim()),
      );

  const comboBoxOptions = filteredOptions.map((item) => (
    <Combobox.Option value={item} key={item} active={item === comboBoxValue}>
      {item}
    </Combobox.Option>
  ));

  const form = useForm<FixtureFormValues>({
    mode: 'controlled',
    initialValues: {
      fixtureName: '',
      vendor: '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  useEffect(() => {
    if (fixtureData?.fixture) {
      const vendorName = fixtureData.fixture.vendor.name;
      setComboBoxValue(vendorName);
      setSearch(vendorName);
      form.initialize({
        fixtureName: fixtureData.fixture.name,
        vendor: vendorName,
      });

      // Automatically select the first channel mode
      if (fixtureData.fixture.channelAssignments.length > 0) {
        setChannelMode(
          fixtureData.fixture.channelAssignments[0]?.channelMode ?? null,
        );
      }
    }
  }, [fixtureData?.fixture]);

  if (fixtureLoading || vendorsLoading) {
    return <Loading />;
  }

  const onSubmit = (values: FixtureFormValues) => {
    console.log(values);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Flex direction="column" gap="lg" mt="lg">
        <Combobox
          store={combobox}
          withinPortal={false}
          onOptionSubmit={(val) => {
            let selectedValue: string;

            if (val === '$create') {
              setComboBoxData((current) => [...current, search]);
              setComboBoxValue(search);
              selectedValue = search;
            } else {
              setComboBoxValue(val);
              setSearch(val);
              selectedValue = val;
            }

            // Update the form value
            form.setFieldValue('vendor', selectedValue);
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <InputBase
              rightSection={<Combobox.Chevron />}
              value={search}
              onChange={(event) => {
                combobox.openDropdown();
                combobox.updateSelectedOptionIndex();
                setSearch(event.currentTarget.value);
              }}
              onClick={() => {
                combobox.openDropdown();
              }}
              onFocus={() => {
                combobox.openDropdown();
              }}
              onBlur={() => {
                combobox.closeDropdown();
                setSearch(comboBoxValue ?? '');
              }}
              placeholder={t({
                id: 'FixtureForm.vendorPlaceholder',
                defaultMessage: 'Select or enter vendor name',
              })}
              rightSectionPointerEvents="none"
              label={t({
                id: 'FixtureForm.vendor',
                defaultMessage: 'Vendor name:',
              })}
              withAsterisk
              error={form.errors.vendor}
            />
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {comboBoxOptions}
              {!exactOptionMatch && search.trim().length > 0 && (
                <Combobox.Option value="$create">
                  + Create {search}
                </Combobox.Option>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <TextInput
          withAsterisk
          label={t({
            id: 'FixtureForm.fixtureName',
            defaultMessage: 'Fixture name:',
          })}
          placeholder={t({
            id: 'FixtureForm.fixtureNamePlaceholder',
            defaultMessage: 'Enter fixture name',
          })}
          key={form.key('fixtureName')}
          {...form.getInputProps('fixtureName')}
        />

        <Text size="xl" fw={600} mt="xl">
          {t({
            id: 'FixtureForm.channelAssignments',
            defaultMessage: 'Channel assignments',
          })}
        </Text>

        <Flex direction="row" gap="5rem">
          <Flex direction="column" gap="md">
            <Text size="sm">
              {t({
                id: 'FixtureForm.channelModes',
                defaultMessage: 'Channel modes:',
              })}
            </Text>
            <Chip.Group
              multiple={false}
              value={channelMode?.toString()}
              onChange={(val) => {
                setChannelMode(val ? Number(val) : null);
              }}
            >
              <Flex direction="column" gap="md">
                {(fixtureData?.fixture?.channelAssignments ?? []).map(
                  (assignment) => (
                    <Chip
                      key={assignment.channelMode}
                      value={assignment.channelMode.toString()}
                    >
                      {assignment.channelMode} Channels
                    </Chip>
                  ),
                )}
              </Flex>
            </Chip.Group>
          </Flex>

          <Flex direction="column" gap="md">
            <Text size="sm">
              {t({
                id: 'FixtureForm.channelsForMode',
                defaultMessage: 'Channels for mode:',
              })}
            </Text>
            <List withPadding listStyleType="none">
              {getChannelsForMode(
                channelMode ?? 0,
                fixtureData?.fixture?.channelAssignments ?? [],
              ).map((channel) => getChannelItem(channel))}
            </List>
          </Flex>
        </Flex>

        <Button
          type="submit"
          mt="sm"
          w="fit-content"
          style={{ alignSelf: 'flex-end' }}
        >
          {t(globalMessages.save)}
        </Button>
      </Flex>
    </form>
  );
};

export default FixtureForm;
