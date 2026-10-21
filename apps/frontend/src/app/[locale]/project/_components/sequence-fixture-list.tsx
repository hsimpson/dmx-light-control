'use client';

import { useTranslation } from '@/lib/i18n/use-translation';
import { Checkbox, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { CaretDownIcon, CaretRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import classes from './sequence-fixture-list.module.css';
import { fixtureAbsoluteChannels, sortedSequenceFixtures, type SequenceFixtureChannel } from './sequence-steps';

export type SequenceFixtureListProperties = {
  fixtures: SequenceFixtureChannel[];
  selectedIds: string[];
  onChange: (fixturePublicIds: string[]) => void;
};

const fixtureLabel = (fixture: SequenceFixtureChannel): string => {
  const channels = fixtureAbsoluteChannels(fixture);
  const start = Math.min(fixture.startAddress, ...channels);
  const end = Math.max(fixture.startAddress, ...channels);
  return `${fixture.name} · DMX ${start}–${end}`;
};

const SequenceFixtureList = ({ fixtures, selectedIds, onChange }: SequenceFixtureListProperties) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const selected = new Set(selectedIds);
  const needle = query.trim().toLowerCase();
  const visible = sortedSequenceFixtures(fixtures).filter(fixture =>
    fixtureLabel(fixture).toLowerCase().includes(needle),
  );
  const fixturesLabel = t({ id: 'ProjectFunction.fixtures', defaultMessage: 'Fixtures' });
  const filterLabel = t({ id: 'ProjectFunction.fixturesFilter', defaultMessage: 'Filter fixtures' });
  const nothingFound = t({ id: 'ProjectFunction.fixturesNothingFound', defaultMessage: 'No fixtures found' });

  const toggle = (publicId: string, checked: boolean) => {
    if (checked === selected.has(publicId)) {
      return;
    }
    onChange(checked ? [...selectedIds, publicId] : selectedIds.filter(id => id !== publicId));
  };

  return (
    <Stack gap={4}>
      <UnstyledButton
        className={classes.header}
        aria-expanded={open}
        onClick={() => {
          setOpen(current => !current);
        }}
      >
        {open ? <CaretDownIcon /> : <CaretRightIcon />}
        <Text component="span" size="sm" fw={600}>
          {fixturesLabel}
        </Text>
        <Text component="span" size="xs" c="dimmed" ml="auto">
          {t(
            { id: 'ProjectFunction.fixturesSummary', defaultMessage: '{selected} of {total}' },
            { selected: selectedIds.length, total: fixtures.length },
          )}
        </Text>
      </UnstyledButton>
      {open ? (
        <Stack gap={6}>
          <TextInput
            size="xs"
            aria-label={filterLabel}
            placeholder={filterLabel}
            leftSection={<MagnifyingGlassIcon />}
            value={query}
            onChange={event => {
              setQuery(event.currentTarget.value);
            }}
          />
          {visible.length === 0 ? (
            <Text size="sm" c="dimmed">
              {nothingFound}
            </Text>
          ) : (
            <div className={classes.list}>
              {visible.map(fixture => (
                <Checkbox
                  key={fixture.publicId}
                  className={classes.option}
                  size="xs"
                  label={fixtureLabel(fixture)}
                  checked={selected.has(fixture.publicId)}
                  onChange={event => {
                    toggle(fixture.publicId, event.currentTarget.checked);
                  }}
                />
              ))}
            </div>
          )}
          {fixtures.length > 0 && selectedIds.length === 0 ? (
            <Text size="xs" c="dimmed">
              {t({
                id: 'ProjectFunction.fixturesPlaceholder',
                defaultMessage: 'Add fixtures to edit their channels',
              })}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

export default SequenceFixtureList;
