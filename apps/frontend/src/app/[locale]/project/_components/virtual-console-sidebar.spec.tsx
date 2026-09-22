import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { fireEvent, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createControl, createDefaultVirtualConsoleDocument } from './virtual-console-document';
import VirtualConsoleSidebar, { type VirtualConsoleAssignableFixture } from './virtual-console-sidebar';

describe('virtual console sidebar', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  it('applies a standard palette swatch to the selected control', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    const background = screen.getByLabelText('Background');
    fireEvent.focus(background);
    const redSwatch = await screen.findByRole('button', { name: '#ff0000' });
    await user.click(redSwatch);
    expect(onControlPatch).toHaveBeenCalledWith({ backgroundColor: '#ff0000' });
  });

  it('applies font family, size and weight from the font modal', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    expect(screen.getByLabelText('Font')).toHaveValue('System UI · 16px · Semibold');

    await user.click(screen.getByLabelText('Font'));
    expect(await screen.findByTestId('virtual-console-font-preview')).toBeInTheDocument();
    await user.click(screen.getByTestId('virtual-console-font-apply'));
    expect(onControlPatch).toHaveBeenCalledWith({
      fontFamily: control.fontFamily,
      fontSize: control.fontSize,
      fontWeight: control.fontWeight,
    });
  });

  it('deletes the selected control from the sidebar', async () => {
    const control = createControl('button', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onDeleteControl = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={vi.fn()}
        onDeleteControl={onDeleteControl}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete control' }));
    expect(onDeleteControl).toHaveBeenCalledTimes(1);
  });

  it('assigns and removes fixture channels on the selected slider', async () => {
    const control = createControl('slider', 0, 0);
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const fixtures: VirtualConsoleAssignableFixture[] = [
      {
        publicId: 'pf-b',
        startAddress: 20,
        fixture: { name: 'Wash', fixtureVendor: { name: 'Acme' } },
        channelMode: {
          name: '2ch',
          fixtureChannelAssignments: [
            {
              publicId: 'assign-dimmer',
              channelNumber: 1,
              fixtureChannelDefinition: { name: 'Dimmer', preset: 'IntensityDimmer' },
            },
          ],
        },
      },
      {
        publicId: 'pf-a',
        startAddress: 1,
        fixture: { name: 'Par', fixtureVendor: { name: 'Generic' } },
        channelMode: {
          name: '3ch',
          fixtureChannelAssignments: [
            {
              publicId: 'assign-red',
              channelNumber: 1,
              fixtureChannelDefinition: { name: 'Red', preset: 'IntensityRed' },
            },
          ],
        },
      },
    ];
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        fixtures={fixtures}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={{
          ...control,
          channelBindings: [{ projectFixturePublicId: 'pf-missing', channelAssignmentPublicId: 'assign-missing' }],
        }}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: '1 · Red · IntensityRed' }));
    expect(onControlPatch).toHaveBeenCalledWith({
      channelBindings: [
        { projectFixturePublicId: 'pf-missing', channelAssignmentPublicId: 'assign-missing' },
        { projectFixturePublicId: 'pf-a', channelAssignmentPublicId: 'assign-red' },
      ],
    });

    onControlPatch.mockClear();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onControlPatch).toHaveBeenCalledWith({ channelBindings: undefined });
  });

  it('reports snap changes from the default of 1 pixel', async () => {
    const document = createDefaultVirtualConsoleDocument();
    const onCanvasSizeChange = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={onCanvasSizeChange}
        onControlPatch={vi.fn()}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={undefined}
        selectedPage={document.pages[0]}
        selection={{ kind: 'canvas' }}
      />,
    );

    expect(screen.getByLabelText('Snap')).toHaveValue('1');
    const snap = screen.getByLabelText('Snap');
    await user.clear(snap);
    await user.type(snap, '8');
    expect(onCanvasSizeChange).toHaveBeenCalledWith('snap', 8);
  });

  it('pops the console out and reports canvas width changes', async () => {
    const document = createDefaultVirtualConsoleDocument();
    const onPopOut = vi.fn();
    const onCanvasSizeChange = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={onCanvasSizeChange}
        onControlPatch={vi.fn()}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onPopOut={onPopOut}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={undefined}
        selectedPage={document.pages[0]}
        selection={{ kind: 'canvas' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pop out' }));
    expect(onPopOut).toHaveBeenCalledTimes(1);

    const width = screen.getByLabelText('Width');
    await user.clear(width);
    await user.type(width, '800');
    expect(onCanvasSizeChange).toHaveBeenCalledWith('width', 800);
  });

  it('renames the selected page', async () => {
    const document = createDefaultVirtualConsoleDocument();
    const page = document.pages[0];
    expect(page).toBeDefined();
    if (!page) {
      return;
    }
    const onPageNameChange = vi.fn();
    const { user } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={vi.fn()}
        onDeleteControl={vi.fn()}
        onPageNameChange={onPageNameChange}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={undefined}
        selectedPage={page}
        selection={{ kind: 'page', pageId: page.id }}
      />,
    );

    const name = screen.getByLabelText('Page name');
    await user.clear(name);
    await user.type(name, 'Intro');
    expect(onPageNameChange).toHaveBeenCalled();
  });

  it('patches frame, slider and button specific fields', async () => {
    const document = createDefaultVirtualConsoleDocument();
    const onControlPatch = vi.fn();
    const frame = createControl('frame', 0, 0);
    const { user, rerender } = renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={frame}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: frame.id }}
      />,
    );

    await user.type(screen.getByLabelText('X'), '4');
    expect(onControlPatch).toHaveBeenCalled();

    const slider = { ...createControl('slider', 0, 0), orientation: undefined, valueType: undefined };
    rerender(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={onControlPatch}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={slider}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: slider.id }}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Orientation' }));
    await user.click(await screen.findByText('Horizontal'));
    expect(onControlPatch).toHaveBeenCalledWith({ orientation: 'horizontal' });
    await user.click(screen.getByRole('combobox', { name: 'Value type' }));
    await user.click(await screen.findByText('Percentage'));
    expect(onControlPatch).toHaveBeenCalledWith({ valueType: 'percentage' });
  });

  it('shows a custom font family when the value is not in the catalog', () => {
    const document = createDefaultVirtualConsoleDocument();
    const control = {
      ...createControl('button', 0, 0),
      fontFamily: '"Comic Sans MS", cursive',
      fontSize: undefined,
      fontWeight: undefined,
    };
    renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={vi.fn()}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={control}
        selectedPage={document.pages[0]}
        selection={{ kind: 'control', controlId: control.id }}
      />,
    );

    expect(screen.getByLabelText('Font')).toHaveValue('"Comic Sans MS", cursive · 16px · Default');
  });

  it('starts a palette drag with the control type', () => {
    const document = createDefaultVirtualConsoleDocument();
    renderWithProviders(
      <VirtualConsoleSidebar
        document={document}
        dirty={false}
        onCanvasSizeChange={vi.fn()}
        onControlPatch={vi.fn()}
        onDeleteControl={vi.fn()}
        onPageNameChange={vi.fn()}
        onSave={vi.fn()}
        onSelectCanvas={vi.fn()}
        saving={false}
        selectedControl={undefined}
        selectedPage={document.pages[0]}
        selection={{ kind: 'canvas' }}
      />,
    );

    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'none',
    };
    fireEvent.dragStart(screen.getByText('Button'), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-virtual-console-control', 'button');
    expect(dataTransfer.effectAllowed).toBe('copy');
  });
});
