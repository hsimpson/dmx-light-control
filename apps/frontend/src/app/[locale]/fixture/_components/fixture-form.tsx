'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesQuery, GetVendorsQuery } from '@/shared/types/graphql/graphql';
import { Button, Combobox, Flex, InputBase, TextInput, useCombobox } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useState } from 'react';
import { z } from 'zod/v4';
import FixtureChannelDefinitions from './fixture-channel-definitions';

type Fixture = GetFixturesQuery['fixtures'][number];

type FixtureFormProps = {
  fixture?: Fixture;
  vendors: GetVendorsQuery['vendors'];
};

// const getChannelsForMode = (channelMode: string, channelAssignments: ChannelAssignment): Channel[] => {
//   const assignment = channelAssignments.find(a => a.channelMode === channelMode);
//   return assignment?.channels ?? [];
// };

const FixtureForm = ({ fixture, vendors }: FixtureFormProps) => {
  const { t } = useTranslation();

  const vendorNames = vendors.map(vendor => vendor.name);

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
    onDropdownOpen: eventSource => {
      if (eventSource === 'keyboard') {
        combobox.selectActiveOption();
      } else {
        combobox.updateSelectedOptionIndex('active');
      }
    },
  });

  const [comboBoxData, setComboBoxData] = useState(vendorNames);
  const [comboBoxValue, setComboBoxValue] = useState(fixture?.fixtureVendor.name ?? null);
  const [comboBoxSearch, setComboBoxSearch] = useState(fixture?.fixtureVendor.name ?? '');

  const [channelDefinitionsToRemove, setChannelDefinitionsToRemove] = useState<string[]>([]);

  const exactOptionMatch = comboBoxData.some(item => item === comboBoxSearch);
  const filteredOptions = exactOptionMatch
    ? comboBoxData
    : comboBoxData.filter(item => item.toLowerCase().includes(comboBoxSearch.toLowerCase().trim()));

  const comboBoxOptions = filteredOptions.map(item => (
    <Combobox.Option value={item} key={item} active={item === comboBoxValue}>
      {item}
    </Combobox.Option>
  ));

  const form = useForm<FixtureFormValues>({
    mode: 'controlled',
    initialValues: {
      fixtureName: fixture?.name ?? '',
      vendor: fixture?.fixtureVendor.name ?? '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  const onSubmit = (values: FixtureFormValues) => {
    console.log(values);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Flex direction="column" gap="lg" mt="lg">
        <Combobox
          store={combobox}
          withinPortal={false}
          onOptionSubmit={val => {
            let selectedValue: string;

            if (val === '$create') {
              setComboBoxData(current => [...current, comboBoxSearch]);
              setComboBoxValue(comboBoxSearch);
              selectedValue = comboBoxSearch;
            } else {
              setComboBoxValue(val);
              setComboBoxSearch(val);
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
              value={comboBoxSearch}
              onChange={event => {
                combobox.openDropdown();
                combobox.updateSelectedOptionIndex();
                setComboBoxSearch(event.currentTarget.value);
              }}
              onClick={() => {
                combobox.openDropdown();
              }}
              onFocus={() => {
                combobox.openDropdown();
              }}
              onBlur={() => {
                combobox.closeDropdown();
                setComboBoxSearch(comboBoxValue ?? '');
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
              {!exactOptionMatch && comboBoxSearch.trim().length > 0 && (
                <Combobox.Option value="$create">+ Create {comboBoxSearch}</Combobox.Option>
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

        <FixtureChannelDefinitions fixtureChannelDefinitions={fixture?.fixtureChannelDefinitions ?? []} />

        <Flex direction="row" gap="5rem">
          <Flex direction="column" gap="md">
            {/* <Text size="sm">
              {t({
                id: 'FixtureForm.channelsForMode',
                defaultMessage: 'Channels for mode:',
              })}
            </Text> */}

            {/* <List withPadding listStyleType="none">
              {getChannelsForMode(
                selectedChannelMode ?? '', // Fallback to empty string if channelMode is null
                fixture?.channelAssignments ?? [],
              ).map(channel => getChannelItem(channel))}
            </List> */}
          </Flex>
        </Flex>

        <Button type="submit" mt="sm" w="fit-content" style={{ alignSelf: 'flex-end' }}>
          {t(globalMessages.save)}
        </Button>
      </Flex>
    </form>
  );
};

export default FixtureForm;
