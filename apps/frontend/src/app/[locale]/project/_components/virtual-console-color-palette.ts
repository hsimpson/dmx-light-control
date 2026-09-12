export type VirtualConsolePaletteColor = {
  id: string;
  label: string;
  value: string;
};

/** Standard lighting colors for virtual-console color pickers. Edit this list to change the swatches. */
export const VIRTUAL_CONSOLE_COLOR_PALETTE: readonly VirtualConsolePaletteColor[] = [
  { id: 'black', label: 'Black', value: '#000000' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'red', label: 'Red', value: '#ff0000' },
  { id: 'green', label: 'Green', value: '#00ff00' },
  { id: 'blue', label: 'Blue', value: '#0000ff' },
  { id: 'amber', label: 'Amber', value: '#ffbf00' },
  { id: 'violet', label: 'Violet (UV)', value: '#7f00ff' },
  { id: 'yellow', label: 'Yellow', value: '#ffff00' },
  { id: 'magenta', label: 'Magenta', value: '#ff00ff' },
  { id: 'cyan', label: 'Cyan', value: '#00ffff' },
];

export const VIRTUAL_CONSOLE_COLOR_SWATCHES = VIRTUAL_CONSOLE_COLOR_PALETTE.map(color => color.value);
