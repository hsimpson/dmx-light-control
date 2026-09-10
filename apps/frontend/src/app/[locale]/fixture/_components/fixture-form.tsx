'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  CreateFixtureDocument,
  GetFixturesQuery,
  GetFixtureVendorsQuery,
  UpdateFixtureDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation } from '@apollo/client/react';
import { Button, Combobox, Flex, InputBase, TextInput, useCombobox } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod/v4';
import FixtureChannelDefinitions, {
  EditorChannelDefinition,
  toChannelDefinitionSaveInputs,
  toEditorChannelDefinitions,
} from './fixture-channel-definitions';
import FixtureChannelModes, {
  EditorChannelMode,
  toChannelModeSaveInputs,
  toEditorChannelModes,
} from './fixture-channel-modes';
import FixtureDetailTabs from './fixture-detail-tabs';
import FixtureProperties, { type FixturePropertiesValues } from './fixture-properties';

type Fixture = GetFixturesQuery['fixtures'][number];

type FixtureFormProps = {
  fixture?: Fixture;
  vendors: GetFixtureVendorsQuery['fixtureVendors'];
  showTabs?: boolean;
};

const syncChannelModesWithDefinitions = (
  modes: EditorChannelMode[],
  definitions: EditorChannelDefinition[],
): EditorChannelMode[] =>
  modes.map(mode => ({
    ...mode,
    fixtureChannelAssignments: mode.fixtureChannelAssignments.map(assignment => {
      const updatedDefinition = definitions.find(
        definition =>
          definition.publicId !== undefined && definition.publicId === assignment.fixtureChannelDefinition.publicId,
      );
      if (!updatedDefinition?.publicId) {
        return assignment;
      }

      return {
        ...assignment,
        fixtureChannelDefinition: updatedDefinition,
      };
    }),
  }));

const FixtureForm = ({ fixture, vendors, showTabs = false }: FixtureFormProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [updateFixture, { loading: isUpdating }] = useMutation(UpdateFixtureDocument);
  const [createFixture, { loading: isCreating }] = useMutation(CreateFixtureDocument);

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
  const [channelDefinitions, setChannelDefinitions] = useState(() =>
    toEditorChannelDefinitions(fixture?.fixtureChannelDefinitions ?? []),
  );
  const [properties, setProperties] = useState<FixturePropertiesValues>({
    weight: fixture?.weight ?? null,
    width: fixture?.width ?? null,
    length: fixture?.length ?? null,
    height: fixture?.height ?? null,
    picturePath: fixture?.picturePath ?? null,
    picture2dPath: fixture?.picture2dPath ?? null,
    model3dPath: fixture?.model3dPath ?? null,
  });

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
    const vendorInput = comboBoxPublicId ? { publicId: comboBoxPublicId } : { name: values.vendor };

    try {
      if (fixture) {
        const { data } = await updateFixture({
          variables: {
            input: {
              publicId: fixture.publicId,
              name: values.fixtureName,
              vendor: vendorInput,
              weight: properties.weight,
              width: properties.width,
              length: properties.length,
              height: properties.height,
              channelModes: toChannelModeSaveInputs(channelModes),
              channelDefinitions: toChannelDefinitionSaveInputs(channelDefinitions),
            },
          },
        });

        if (data?.updateFixture.fixtureChannelDefinitions) {
          setChannelDefinitions(toEditorChannelDefinitions(data.updateFixture.fixtureChannelDefinitions));
        }
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
      } else {
        const { data } = await createFixture({
          variables: {
            input: {
              name: values.fixtureName,
              vendor: vendorInput,
              weight: properties.weight,
              width: properties.width,
              length: properties.length,
              height: properties.height,
              channelModes: toChannelModeSaveInputs(channelModes),
              channelDefinitions: toChannelDefinitionSaveInputs(channelDefinitions),
            },
          },
        });

        const createdPublicId = data?.createFixture.publicId;
        notifications.show({
          color: 'green',
          title: t(globalMessages.success),
          message: t({
            id: 'FixtureForm.notification.createSuccess',
            defaultMessage: 'Fixture created successfully',
          }),
        });
        if (createdPublicId) {
          router.push(`/fixture/${createdPublicId}/general`);
        }
      }
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: fixture
          ? t({
              id: 'FixtureForm.notification.updateError',
              defaultMessage: 'Failed to update fixture',
            })
          : t({
              id: 'FixtureForm.notification.createError',
              defaultMessage: 'Failed to create fixture',
            }),
      });
    }
  };

  const generalFields = (
    <>
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
    </>
  );

  const channelDefinitionsFields = (
    <FixtureChannelDefinitions
      channelDefinitions={channelDefinitions}
      onChannelDefinitionsChange={nextDefinitions => {
        setChannelDefinitions(nextDefinitions);
        setChannelModes(currentModes => syncChannelModesWithDefinitions(currentModes, nextDefinitions));
      }}
    />
  );

  const channelModesFields = (
    <FixtureChannelModes
      channelModes={channelModes}
      persistedChannelDefinitions={channelDefinitions}
      onChannelModesChange={setChannelModes}
    />
  );

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Flex direction="column" gap="lg" mt="lg">
        {showTabs && fixture ? (
          <FixtureDetailTabs
            fixturePublicId={fixture.publicId}
            general={
              <Flex direction="column" gap="lg">
                {generalFields}
              </Flex>
            }
            properties={
              <FixtureProperties
                fixturePublicId={fixture.publicId}
                values={properties}
                onDimensionsChange={next => {
                  setProperties(current => ({ ...current, ...next }));
                }}
                onAssetPathChange={(kind, path) => {
                  setProperties(current => {
                    if (kind === 'picture') {
                      return { ...current, picturePath: path };
                    }
                    if (kind === 'picture2d') {
                      return { ...current, picture2dPath: path };
                    }
                    return { ...current, model3dPath: path };
                  });
                }}
              />
            }
            channels={channelDefinitionsFields}
            channelModes={channelModesFields}
          />
        ) : (
          <>
            {generalFields}
            {channelDefinitionsFields}
            {channelModesFields}
          </>
        )}

        <Button
          type="submit"
          mt="sm"
          w="fit-content"
          style={{ alignSelf: 'flex-end' }}
          disabled={isUpdating || isCreating}
        >
          {t(globalMessages.save)}
        </Button>
      </Flex>
    </form>
  );
};

export default FixtureForm;
