import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SequenceFixtureList from './sequence-fixture-list';
import type { SequenceFixtureChannel } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  { publicId: 'par', startAddress: 1, name: 'PAR', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
  { publicId: 'wash', startAddress: 5, name: 'Wash', channels: [{ channelNumber: 1, name: 'Intensity' }] },
];

describe('SequenceFixtureList', () => {
  it('collapses and expands the fixture list', async () => {
    const { user } = renderWithProviders(
      <SequenceFixtureList fixtures={fixtures} selectedIds={['par']} onChange={vi.fn()} />,
    );

    expect(screen.queryByRole('checkbox', { name: 'PAR [1]' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fixtures/ }));
    expect(screen.getByRole('checkbox', { name: 'PAR [1]' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wash [2]' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /Fixtures/ }));
    expect(screen.queryByRole('checkbox', { name: 'PAR [1]' })).not.toBeInTheDocument();
  });

  it('filters the list and reports the next selection', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <SequenceFixtureList fixtures={fixtures} selectedIds={['par']} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /Fixtures/ }));
    await user.type(screen.getByRole('textbox', { name: 'Filter fixtures' }), 'wash');
    expect(screen.queryByRole('checkbox', { name: 'PAR [1]' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Wash [2]' }));
    expect(onChange).toHaveBeenCalledWith(['par', 'wash']);

    await user.clear(screen.getByRole('textbox', { name: 'Filter fixtures' }));
    await user.click(screen.getByRole('checkbox', { name: 'PAR [1]' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
