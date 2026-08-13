'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { GetFixturesQuery, GetFixtureVendorsQuery, UpdateFixtureDocument } from '@/shared/types/graphql/graphql';
import { useMutation } from '@apollo/client/react';
import { Button, Combobox, Flex, InputBase, TextInput, useCombobox } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { z } from 'zod/v4';
import FixtureChannelDefinitions from './fixture-channel-definitions';
import FixtureChannelModes, { toChannelModeSaveInputs, toEditorChannelModes } from './fixture-channel-modes';

type Fixture = GetFixturesQuery['fixtures'][number];

type FixtureFormProps = {
  fixture?: Fixture;
  vendors: GetFixtureVendorsQuery['fixtureVendors'];
};

const FixtureForm = ({ fixture, vendors }: FixtureFormProps) => {
  const { t } = useTranslation();
  const [updateFixture] = useMutation(UpdateFixtureDocument);

  const vendorNames = vendors.map(vendor => vendor.name);
  const vendorPublicIdByName = new Map(vendors.map(vendor => [vendor.name, vendor.publicId]));

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
  const [comboBoxPublicId, setComboBoxPublicId] = useState(fixture?.fixtureVendor.publicId ?? null);
  const [comboBoxSearch, setComboBoxSearch] = useState(fixture?.fixtureVendor.name ?? '');
  const [channelModes, setChannelModes] = useState(() => toEditorChannelModes(fixture?.fixtureChannelModes ?? []));

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

  const onSubmit = async (values: FixtureFormValues) => {
    if (!fixture) {
      return;
    }

    const vendorInput = comboBoxPublicId ? { publicId: comboBoxPublicId } : { name: values.vendor };

    try {
      const { data } = await updateFixture({
        variables: {
          input: {
            publicId: fixture.publicId,
            name: values.fixtureName,
            vendor: vendorInput,
            channelModes: toChannelModeSaveInputs(channelModes),
          },
        },
      });

      if (data?.updateFixture.fixtureChannelModes) {
        setChannelModes(toEditorChannelModes(data.updateFixture.fixtureChannelModes));
      }

      notifications.show({
        color: 'green',
        title: t(globalMessages.success),
        message: t({
          id: 'FixtureForm.notification.updateSuccess',
          defaultMessage: 'Fixture updated successfully',
        }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({
          id: 'FixtureForm.notification.updateError',
          defaultMessage: 'Failed to update fixture',
        }),
      });
    }
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
              setComboBoxPublicId(null);
              selectedValue = comboBoxSearch;
            } else {
              setComboBoxValue(val);
              setComboBoxSearch(val);
              setComboBoxPublicId(vendorPublicIdByName.get(val) ?? null);
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
        <FixtureChannelModes
          channelModes={channelModes}
          persistedChannelDefinitions={fixture?.fixtureChannelDefinitions ?? []}
          onChannelModesChange={setChannelModes}
        />

        <Button type="submit" mt="sm" w="fit-content" style={{ alignSelf: 'flex-end' }}>
          {t(globalMessages.save)}
        </Button>
      </Flex>
    </form>
  );
};

export default FixtureForm;
