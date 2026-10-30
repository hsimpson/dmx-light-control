import { MidiLedType } from '@/shared/types/graphql/graphql';
import { describe, expect, it } from 'vitest';
import { paletteFor, palettesInput, palettesValues } from './midi-led-palettes';

describe('midi led palettes', () => {
  it('GIVEN palettes from GraphQL WHEN round-tripped THEN typenames are dropped and missing types are empty', () => {
    const values = palettesValues({
      rgb: {
        behaviors: [{ name: 'Solid', value: 6 }],
        colors: [{ name: 'Red', value: 5, hex: '#FF0000', __typename: 'MidiLedOptionDto' } as never],
      },
      single: null,
    });

    expect(palettesInput(values)).toEqual({
      rgb: { behaviors: [{ name: 'Solid', value: 6, hex: null }], colors: [{ name: 'Red', value: 5, hex: '#FF0000' }] },
      single: { behaviors: [], colors: [] },
    });
  });

  it('GIVEN an LED type WHEN looking up its palette THEN only a non-empty palette is returned', () => {
    const palettes = { rgb: { behaviors: [{ name: 'Solid', value: 6 }], colors: [] }, single: null };

    expect(paletteFor(palettes, MidiLedType.Rgb)?.behaviors).toHaveLength(1);
    expect(paletteFor(palettes, MidiLedType.Single)).toBeUndefined();
    expect(paletteFor(palettes, null)).toBeUndefined();
  });
});
