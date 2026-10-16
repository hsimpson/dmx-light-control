import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceEditor from './sequence-editor';
import type { SequenceFixtureChannel } from './sequence-steps';

const fixtures: SequenceFixtureChannel[] = [
  { publicId: 'par', startAddress: 1, name: 'PAR', channels: [{ channelNumber: 1, name: 'Dimmer' }] },
];

const initial = (): ProjectFunctionDraft => ({
  name: 'Chase',
  direction: 'forward',
  runOrder: 'loop',
  steps: [{ key: 's1', fadeIn: 0, hold: 0, fadeOut: 0, dmxValues: [] }],
});

describe('SequenceEditor', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('saves the edited draft', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={onSave} onLeave={vi.fn()} />,
    );
    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wave');
    await user.click(screen.getByRole('gridcell', { name: 'Dimmer · 1, Step 1' }));
    await user.keyboard('200{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Wave',
        steps: [expect.objectContaining({ dmxValues: [expect.objectContaining({ channel: 1, value: 200 })] })],
      }),
    );
  });

  it('leaves immediately when there are no changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving with unsaved changes', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor fixtures={fixtures} initial={initial()} saving={false} onSave={vi.fn()} onLeave={onLeave} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onLeave).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('treats the draft as clean after a successful save', async () => {
    const onLeave = vi.fn();
    const { user } = renderWithProviders(
      <SequenceEditor
        fixtures={fixtures}
        initial={initial()}
        saving={false}
        onSave={vi.fn().mockResolvedValue(true)}
        onLeave={onLeave}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });
});
