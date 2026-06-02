'use client';

import { Loading } from '@/components/loading';
import { globalMessages } from '@/lib/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  GetFixtureDocument,
  GetVendorsDocument,
} from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import {
  Button,
  Combobox,
  InputBase,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { z } from 'zod/v4';

type FixtureFormProps = {
  fixtureId?: string;
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
      <Button type="submit" mt="sm">
        {t(globalMessages.save)}
      </Button>
    </form>
  );
};

export default FixtureForm;
