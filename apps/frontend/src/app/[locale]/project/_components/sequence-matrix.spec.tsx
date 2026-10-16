import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SequenceMatrix from './sequence-matrix';
import type { MatrixRange } from './sequence-matrix-model';
import type { SequenceFixtureChannel, SequenceStepDraft } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  {
    publicId: 'par',
    startAddress: 10,
    name: 'PAR',
    channels: [
      { channelNumber: 1, name: 'Dimmer' },
      { channelNumber: 2, name: 'Red' },
    ],
  },
];

const initialSteps = (): SequenceStepDraft[] => [
  { key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [{ key: 'd1', channel: 10, value: 50 }] },
  { key: 's2', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] },
];

const onStepsChange = vi.fn<(steps: SequenceStepDraft[]) => void>();

const latestSteps = (): SequenceStepDraft[] => onStepsChange.mock.lastCall?.[0] ?? [];

const Harness = () => {
  const [steps, setSteps] = useState(initialSteps);
  const [range, setRange] = useState<MatrixRange>({ anchor: { row: 0, column: 0 }, focus: { row: 0, column: 0 } });
  return (
    <SequenceMatrix
      fixtures={fixtures}
      steps={steps}
      range={range}
      onChange={next => {
        onStepsChange(next);
        setSteps(next);
      }}
      onRangeChange={setRange}
    />
  );
};

const cell = (name: string) => screen.getByRole('gridcell', { name });

describe('SequenceMatrix', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
    onStepsChange.mockClear();
  });

  it('renders steps as columns and channels grouped by fixture', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByRole('columnheader', { name: /Step 1/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Step 2/ })).toBeInTheDocument();
    expect(screen.getByText('PAR [1] · DMX 10–11')).toBeInTheDocument();
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('50');
    expect(cell('Red · 11, Step 1')).toHaveTextContent('');
  });

  it('edits a cell by typing and pressing Enter', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Red · 11, Step 2'));
    await user.keyboard('128{Enter}');
    expect(cell('Red · 11, Step 2')).toHaveTextContent('128');
    expect(latestSteps()[1]?.dmxValues).toMatchObject([{ channel: 11, value: 128 }]);
  });

  it('clears the selection with Delete and moves with arrow keys', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Fade in (ms), Step 1'));
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(cell('Dimmer · 10, Step 1')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Delete}');
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('');
  });

  it('fills a shift-selected range with Ctrl+Enter', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Dimmer · 10, Step 1'));
    await user.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}');
    await user.keyboard('9{Control>}{Enter}{/Control}');
    for (const name of ['Dimmer · 10, Step 1', 'Red · 11, Step 1', 'Dimmer · 10, Step 2', 'Red · 11, Step 2']) {
      expect(cell(name)).toHaveTextContent('9');
    }
  });

  it('pastes tab-separated values at the selection', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(cell('Dimmer · 10, Step 1'));
    await user.paste('1\t2\n3\t4');
    expect(cell('Red · 11, Step 2')).toHaveTextContent('4');
  });

  it('filters and collapses channel rows', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.type(screen.getByRole('textbox', { name: 'Filter channels' }), 'red');
    expect(screen.queryByRole('gridcell', { name: 'Dimmer · 10, Step 1' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Filter channels' }));
    await user.click(screen.getByRole('button', { name: 'Toggle PAR [1] · DMX 10–11' }));
    expect(screen.queryByRole('gridcell', { name: 'Red · 11, Step 1' })).not.toBeInTheDocument();
  });

  it('duplicates, inserts and removes steps from the column menu', async () => {
    const { user } = renderWithProviders(<Harness />);
    const chooseStepAction = async (action: string) => {
      await user.click(screen.getByRole('button', { name: 'Step 1 actions' }));
      await user.click(await screen.findByRole('menuitem', { name: action }));
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).not.toBeInTheDocument();
      });
    };

    await chooseStepAction('Duplicate step');
    expect(cell('Dimmer · 10, Step 2')).toHaveTextContent('50');
    expect(latestSteps()).toHaveLength(3);

    await chooseStepAction('Insert step before');
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('');
    expect(latestSteps()).toHaveLength(4);

    await chooseStepAction('Remove step');
    expect(latestSteps()).toHaveLength(3);
    expect(cell('Dimmer · 10, Step 1')).toHaveTextContent('50');
  });

  it('adds a step from the toolbar', async () => {
    const { user } = renderWithProviders(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByRole('columnheader', { name: 'Step 3' })).toBeInTheDocument();
  });
});
