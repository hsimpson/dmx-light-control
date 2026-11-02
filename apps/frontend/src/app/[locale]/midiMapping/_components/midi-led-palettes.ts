import { MidiLedType, type MidiLedPalettesInput } from '@/shared/types/graphql/graphql';

export type MidiLedOptionValues = { name: string; value: number; hex: string | null };
export type MidiLedPaletteValues = { behaviors: MidiLedOptionValues[]; colors: MidiLedOptionValues[] };
export type MidiLedPalettesValues = Record<MidiLedType, MidiLedPaletteValues>;

type OptionLike = { name: string; value: number; hex?: string | null };
type PaletteLike = { behaviors: readonly OptionLike[]; colors: readonly OptionLike[] } | null | undefined;
type PalettesLike = { rgb?: PaletteLike; single?: PaletteLike } | null | undefined;

const emptyPalette = (): MidiLedPaletteValues => ({ behaviors: [], colors: [] });

/** Copies only the option fields (no `__typename`), so the result can be edited and sent back as input. */
const paletteValues = (palette: PaletteLike): MidiLedPaletteValues => {
  const toOption = ({ name, value, hex }: OptionLike) => ({ name, value, hex: hex ?? null });
  return palette
    ? { behaviors: palette.behaviors.map(toOption), colors: palette.colors.map(toOption) }
    : emptyPalette();
};

export const palettesValues = (palettes: PalettesLike): MidiLedPalettesValues => ({
  [MidiLedType.Rgb]: paletteValues(palettes?.rgb),
  [MidiLedType.Single]: paletteValues(palettes?.single),
});

export const palettesInput = (values: MidiLedPalettesValues): MidiLedPalettesInput => ({
  rgb: values[MidiLedType.Rgb],
  single: values[MidiLedType.Single],
});

/** The palette the editors offer for an entry's LED type; undefined when it has no options. */
export const paletteFor = (palettes: PalettesLike, ledType: MidiLedType | null | undefined) => {
  if (!ledType) {
    return undefined;
  }
  const palette = palettesValues(palettes)[ledType];
  return palette.behaviors.length > 0 || palette.colors.length > 0 ? palette : undefined;
};
