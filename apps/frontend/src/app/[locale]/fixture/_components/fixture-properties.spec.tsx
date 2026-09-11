import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FixtureProperties from './fixture-properties';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./fixture-model-preview', () => ({
  default: () => <div data-testid="model-preview" />,
}));

const defaultValues = {
  weight: 4,
  width: 0.2,
  length: 0.3,
  height: 0.4,
  picturePath: null,
  picture2dPath: null,
  model3dPath: null,
};

describe('FixtureProperties', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
    vi.stubEnv('NEXT_PUBLIC_GRAPHQL_API_URL', 'http://localhost:3000/graphql');
  });

  it('renders dimension and asset sections', () => {
    renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={defaultValues}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Dimensions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('4 kg');
    expect(screen.getByTestId('model-preview')).toBeInTheDocument();
  });

  it('clears a dimension when the input is emptied', async () => {
    const onDimensionsChange = vi.fn();
    const { user } = renderWithProviders(
      <FixtureProperties values={defaultValues} onDimensionsChange={onDimensionsChange} onAssetPathChange={vi.fn()} />,
    );

    const weight = screen.getByRole('textbox', { name: 'Weight' });
    await user.clear(weight);

    expect(onDimensionsChange).toHaveBeenCalledWith({ ...defaultValues, weight: null });
  });

  it('clears length and height inputs', async () => {
    const onDimensionsChange = vi.fn();
    const { user } = renderWithProviders(
      <FixtureProperties values={defaultValues} onDimensionsChange={onDimensionsChange} onAssetPathChange={vi.fn()} />,
    );

    await user.clear(screen.getByRole('textbox', { name: 'Length' }));
    expect(onDimensionsChange).toHaveBeenCalledWith({ ...defaultValues, length: null });

    onDimensionsChange.mockClear();
    await user.clear(screen.getByRole('textbox', { name: 'Height' }));
    expect(onDimensionsChange).toHaveBeenCalledWith({ ...defaultValues, height: null });
  });

  it('updates width when a valid number is entered', async () => {
    const onDimensionsChange = vi.fn();
    const { user } = renderWithProviders(
      <FixtureProperties
        values={{ ...defaultValues, width: null }}
        onDimensionsChange={onDimensionsChange}
        onAssetPathChange={vi.fn()}
      />,
    );

    const width = screen.getByRole('textbox', { name: 'Width' });
    await user.type(width, '1.5');

    expect(onDimensionsChange).toHaveBeenCalledWith(expect.objectContaining({ width: 1.5 }));
  });

  it('updates length and height when a valid number is entered', async () => {
    const onDimensionsChange = vi.fn();
    const { user } = renderWithProviders(
      <FixtureProperties
        values={{ ...defaultValues, length: null, height: null }}
        onDimensionsChange={onDimensionsChange}
        onAssetPathChange={vi.fn()}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Length' }), '2');
    expect(onDimensionsChange).toHaveBeenCalledWith(expect.objectContaining({ length: 2 }));

    await user.type(screen.getByRole('textbox', { name: 'Height' }), '3');
    expect(onDimensionsChange).toHaveBeenCalledWith(expect.objectContaining({ height: 3 }));
  });

  it('uploads an asset and reports the returned path', async () => {
    const onAssetPathChange = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ path: '/assets/fixtures/vendor/spot/picture.webp' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { user } = renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={defaultValues}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={onAssetPathChange}
      />,
    );

    const uploadButtons = screen.getAllByRole('button', { name: 'Upload' });
    const pictureUpload = uploadButtons[0];
    if (!pictureUpload) {
      throw new Error('expected picture upload button');
    }

    const file = new File(['png'], 'photo.png', { type: 'image/png' });
    const fileInput = pictureUpload.parentElement?.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('expected hidden file input');
    }
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/fixtures/fix-1/assets/picture',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(onAssetPathChange).toHaveBeenCalledWith('picture', '/assets/fixtures/vendor/spot/picture.webp');

    vi.unstubAllGlobals();
  });

  it('shows an error notification when upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { user } = renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={defaultValues}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={vi.fn()}
      />,
    );

    const uploadButtons = screen.getAllByRole('button', { name: 'Upload' });
    const pictureUpload = uploadButtons[0];
    if (!pictureUpload) {
      throw new Error('expected picture upload button');
    }

    const fileInput = pictureUpload.parentElement?.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('expected hidden file input');
    }
    await user.upload(fileInput, new File(['png'], 'photo.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });

    vi.unstubAllGlobals();
  });

  it('clears a custom picture asset', async () => {
    const onAssetPathChange = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const { user } = renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={{ ...defaultValues, picturePath: '/assets/custom.webp' }}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={onAssetPathChange}
      />,
    );

    const clearButtons = screen.getAllByRole('button', { name: 'Use default' });
    const pictureClear = clearButtons[0];
    if (!pictureClear) {
      throw new Error('expected picture clear button');
    }
    await user.click(pictureClear);

    await waitFor(() => {
      expect(onAssetPathChange).toHaveBeenCalledWith('picture', null);
    });

    vi.unstubAllGlobals();
  });

  it('disables asset actions when the fixture is not saved yet', () => {
    renderWithProviders(
      <FixtureProperties values={defaultValues} onDimensionsChange={vi.fn()} onAssetPathChange={vi.fn()} />,
    );

    for (const button of screen.getAllByRole('button', { name: 'Upload' })) {
      expect(button).toBeDisabled();
    }
  });

  it('shows an error when clearing an asset fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { user } = renderWithProviders(
      <FixtureProperties
        fixturePublicId="fix-1"
        values={{ ...defaultValues, picture2dPath: '/assets/custom.svg' }}
        onDimensionsChange={vi.fn()}
        onAssetPathChange={vi.fn()}
      />,
    );

    const clearButtons = screen.getAllByRole('button', { name: 'Use default' });
    const picture2dClear = clearButtons[1];
    if (!picture2dClear) {
      throw new Error('expected 2D picture clear button');
    }
    await user.click(picture2dClear);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });

    vi.unstubAllGlobals();
  });
});
