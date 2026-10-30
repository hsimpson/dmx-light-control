import { UpdateMidiMappingDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MidiLedPaletteEditor from './midi-led-palette-editor';

const mapping = { publicId: 'midi-1', name: 'APC mini mk2', ledPalettes: { rgb: null, single: null } };
const now = new Date('2026-01-01T00:00:00.000Z');
const saved = (ledPalettes: unknown) => () => ({
  data: {
    updateMidiMapping: {
      __typename: 'MidiMappingDto',
      ...mapping,
      createdAt: now,
      updatedAt: now,
      ledPalettes,
      entries: [],
    },
  },
});

describe('MidiLedPaletteEditor', () => {
  it('GIVEN the single-color tab WHEN a color is added, named and another removed THEN the edited list is saved', async () => {
    const ledPalettes = {
      rgb: { behaviors: [], colors: [] },
      single: { behaviors: [], colors: [{ name: 'Lit', value: 1, hex: null }] },
    };
    const update = vi.fn(saved(null));
    const { user } = renderWithProviders(
      <MidiLedPaletteEditor
        mapping={{
          ...mapping,
          ledPalettes: { rgb: null, single: { behaviors: [], colors: [{ name: 'Off', value: 0 }] } },
        }}
      />,
      {
        apolloMocks: [
          {
            request: {
              query: UpdateMidiMappingDocument,
              variables: { input: { publicId: 'midi-1', name: 'APC mini mk2', ledPalettes } },
            },
            result: update,
          },
        ],
      },
    );

    await user.click(screen.getByRole('tab', { name: 'Single-color LED' }));
    const colors = 'Colors (velocity 0-127)';
    await user.click(screen.getByRole('button', { name: `${colors}: Add` }));
    await user.type(screen.getByLabelText(`${colors} 2: Name`), 'Lit');
    await user.clear(screen.getByLabelText(`${colors} 2: Value`));
    await user.type(screen.getByLabelText(`${colors} 2: Value`), '1');
    await user.click(screen.getByRole('button', { name: `${colors} 1: Remove` }));
    await user.click(screen.getByRole('button', { name: 'Save LED colors' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalled();
    });
  });
});
