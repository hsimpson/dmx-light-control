import { describe, expect, it } from 'vitest';
import {
  VIRTUAL_CONSOLE_FONTS,
  VIRTUAL_CONSOLE_FONT_WEIGHTS,
  controlFontStyle,
  findVirtualConsoleFont,
  findVirtualConsoleFontWeight,
} from './virtual-console-fonts';

describe('virtual console fonts', () => {
  it('lists system fonts with CSS family values', () => {
    expect(VIRTUAL_CONSOLE_FONTS.map(font => font.label)).toEqual([
      'System UI',
      'Inter',
      'Arial',
      'Helvetica',
      'Verdana',
      'Georgia',
      'Times New Roman',
      'Courier New',
      'Impact',
    ]);
    expect(VIRTUAL_CONSOLE_FONTS.every(font => font.value.length > 0)).toBe(true);
  });

  it('maps control font properties to CSS', () => {
    expect(controlFontStyle({ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 18, fontWeight: 700 })).toEqual({
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '18px',
      fontWeight: 700,
    });
    expect(controlFontStyle({})).toEqual({
      fontFamily: undefined,
      fontSize: undefined,
      fontWeight: undefined,
    });
    expect(controlFontStyle({ fontSize: null })).toEqual({
      fontFamily: undefined,
      fontSize: undefined,
      fontWeight: undefined,
    });
  });

  it('finds a font option by CSS family', () => {
    expect(findVirtualConsoleFont(VIRTUAL_CONSOLE_FONTS[2]?.value)?.label).toBe('Arial');
    expect(findVirtualConsoleFont('unknown')).toBeUndefined();
    expect(VIRTUAL_CONSOLE_FONT_WEIGHTS.map(weight => weight.value)).toEqual([400, 500, 600, 700]);
    expect(findVirtualConsoleFontWeight(700)?.id).toBe('bold');
    expect(findVirtualConsoleFontWeight(undefined)).toBeUndefined();
  });
});
