import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import SequenceStepsEditor from './sequence-steps-editor';
import {
  emptySequenceStep,
  moveSequenceStep,
  type SequenceFixtureChannel,
  type SequenceStepDraft,
} from './sequence-steps';

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
  {
    publicId: 'wash',
    startAddress: 1,
    name: 'Wash',
    channels: [{ channelNumber: 1, name: 'Intensity' }],
  },
];

const EditorHarness = () => {
  const [steps, setSteps] = useState<SequenceStepDraft[]>(() => [emptySequenceStep()]);
  return <SequenceStepsEditor fixtures={fixtures} steps={steps} onChange={setSteps} />;
};

describe('sequence steps editor', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('adds a DMX value by fixture and absolute channel', async () => {
    const { user } = renderWithProviders(<EditorHarness />);

    await user.click(screen.getByRole('button', { name: 'Add DMX value' }));

    expect(screen.getByRole('combobox', { name: 'Fixture' })).toHaveValue('Wash [1]');
    expect(screen.getByRole('combobox', { name: 'Channel' })).toHaveValue('1 · Intensity');

    await user.click(screen.getByRole('combobox', { name: 'Fixture' }));
    const parOption = (await screen.findAllByText('PAR [2]')).find(node => node.tagName === 'SPAN');
    if (!parOption) {
      throw new Error('expected PAR option');
    }
    await user.click(parOption);
    expect(screen.getByRole('combobox', { name: 'Channel' })).toHaveValue('10 · Dimmer');

    await user.click(screen.getByRole('combobox', { name: 'Channel' }));
    const redOption = (await screen.findAllByText('11 · Red')).find(node => node.tagName === 'SPAN');
    if (!redOption) {
      throw new Error('expected Red option');
    }
    await user.click(redOption);
    expect(screen.getByRole('combobox', { name: 'Channel' })).toHaveValue('11 · Red');
  });

  it('keeps each step on its fixture after the steps are reordered', async () => {
    const Harness = () => {
      const [steps, setSteps] = useState<SequenceStepDraft[]>([
        {
          key: 'wash-step',
          fadeIn: 0,
          hold: 0,
          fadeOut: 0,
          dmxValues: [{ key: 'wash-dmx', channel: 1, value: 255 }],
        },
        {
          key: 'par-step',
          fadeIn: 0,
          hold: 0,
          fadeOut: 0,
          dmxValues: [{ key: 'par-dmx', channel: 10, value: 255 }],
        },
      ]);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setSteps(current => moveSequenceStep(current, 0, 1));
            }}
          >
            Reorder
          </button>
          <SequenceStepsEditor fixtures={fixtures} steps={steps} onChange={setSteps} />
        </>
      );
    };
    const { user } = renderWithProviders(<Harness />);
    const fixtureSelects = () => screen.getAllByRole('combobox', { name: 'Fixture' });
    expect(fixtureSelects()[0]).toHaveValue('Wash [1]');
    expect(fixtureSelects()[1]).toHaveValue('PAR [2]');

    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(fixtureSelects()[0]).toHaveValue('PAR [2]');
    expect(fixtureSelects()[1]).toHaveValue('Wash [1]');
    expect(screen.getAllByRole('combobox', { name: 'Channel' })[0]).toHaveValue('10 · Dimmer');
    expect(screen.getAllByRole('combobox', { name: 'Channel' })[1]).toHaveValue('1 · Intensity');
  });
});
