import { defineMessages } from 'react-intl';

export const VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY = 'system-ui, sans-serif';
export const VIRTUAL_CONSOLE_DEFAULT_FONT_SIZE = 16;
export const VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT = 600;

export const VIRTUAL_CONSOLE_FONT_SIZE_MIN = 8;
export const VIRTUAL_CONSOLE_FONT_SIZE_MAX = 72;

export type VirtualConsoleFontOption = {
  id: string;
  label: string;
  value: string;
};

export type VirtualConsoleFontWeightId = 'regular' | 'medium' | 'semibold' | 'bold';

export type VirtualConsoleFontWeightOption = {
  id: VirtualConsoleFontWeightId;
  label: string;
  value: number;
};

export const virtualConsoleFontWeightMessages = defineMessages({
  regular: {
    id: 'ProjectDetail.virtualConsole.fontWeight.regular',
    defaultMessage: 'Regular',
  },
  medium: {
    id: 'ProjectDetail.virtualConsole.fontWeight.medium',
    defaultMessage: 'Medium',
  },
  semibold: {
    id: 'ProjectDetail.virtualConsole.fontWeight.semibold',
    defaultMessage: 'Semibold',
  },
  bold: {
    id: 'ProjectDetail.virtualConsole.fontWeight.bold',
    defaultMessage: 'Bold',
  },
});

/** System fonts offered in the virtual-console font picker. */
export const VIRTUAL_CONSOLE_FONTS: readonly VirtualConsoleFontOption[] = [
  { id: 'system-ui', label: 'System UI', value: 'system-ui, sans-serif' },
  { id: 'inter', label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { id: 'arial', label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { id: 'helvetica', label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { id: 'georgia', label: 'Georgia', value: 'Georgia, serif' },
  { id: 'times', label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { id: 'courier', label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { id: 'impact', label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
];

export const VIRTUAL_CONSOLE_FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72] as const;

export const VIRTUAL_CONSOLE_FONT_WEIGHTS: readonly VirtualConsoleFontWeightOption[] = [
  { id: 'regular', label: 'Regular', value: 400 },
  { id: 'medium', label: 'Medium', value: 500 },
  { id: 'semibold', label: 'Semibold', value: 600 },
  { id: 'bold', label: 'Bold', value: 700 },
];

export type VirtualConsoleFontStyleSource = {
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: number | null;
};

export const controlFontStyle = (control: VirtualConsoleFontStyleSource) => ({
  fontFamily: control.fontFamily ?? undefined,
  fontSize: control.fontSize === undefined || control.fontSize === null ? undefined : `${control.fontSize}px`,
  fontWeight: control.fontWeight ?? undefined,
});

export const findVirtualConsoleFont = (fontFamily: string | null | undefined) =>
  VIRTUAL_CONSOLE_FONTS.find(font => font.value === fontFamily);

export const findVirtualConsoleFontWeight = (fontWeight: number | null | undefined) =>
  VIRTUAL_CONSOLE_FONT_WEIGHTS.find(weight => weight.value === fontWeight);
