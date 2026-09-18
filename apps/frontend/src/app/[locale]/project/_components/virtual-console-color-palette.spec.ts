import { describe, expect, it } from 'vitest';
import { VIRTUAL_CONSOLE_COLOR_PALETTE, VIRTUAL_CONSOLE_COLOR_SWATCHES } from './virtual-console-color-palette';

describe('virtual console color palette', () => {
  it('lists the standard lighting colors in a stable order', () => {
    expect(VIRTUAL_CONSOLE_COLOR_PALETTE.map(color => color.label)).toEqual([
      'Black',
      'White',
      'Red',
      'Green',
      'Blue',
      'Amber',
      'Violet (UV)',
      'Yellow',
      'Magenta',
      'Cyan',
    ]);
  });

  it('exposes hex swatches for the color picker', () => {
    expect(VIRTUAL_CONSOLE_COLOR_SWATCHES).toEqual(VIRTUAL_CONSOLE_COLOR_PALETTE.map(color => color.value));
    expect(VIRTUAL_CONSOLE_COLOR_SWATCHES.every(value => /^#[0-9a-f]{6}$/.test(value))).toBe(true);
  });
});
