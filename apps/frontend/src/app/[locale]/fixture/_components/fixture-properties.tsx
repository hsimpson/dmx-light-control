'use client';

import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Button, FileButton, Group, Image, NumberInput, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { type ReactNode, useState } from 'react';
import {
  FIXTURE_DEFAULT_MODEL_3D_PATH,
  FIXTURE_DEFAULT_PICTURE_2D_PATH,
  FIXTURE_DEFAULT_PICTURE_PATH,
  fixtureAssetDisplayUrl,
  fixtureAssetUploadUrl,
  type FixtureAssetKind,
} from './fixture-asset-url';
import FixtureModelPreview from './fixture-model-preview';

export type FixturePropertiesValues = {
  weight: number | null;
  width: number | null;
  length: number | null;
  height: number | null;
  picturePath: string | null;
  picture2dPath: string | null;
  model3dPath: string | null;
};

export type FixturePropertiesPanelProperties = {
  fixturePublicId: string;
  values: FixturePropertiesValues;
  onDimensionsChange: (values: Pick<FixturePropertiesValues, 'weight' | 'width' | 'length' | 'height'>) => void;
  onAssetPathChange: (kind: FixtureAssetKind, path: string | null) => void;
};

function toFiniteNumber(value: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const FixtureProperties = ({
  fixturePublicId,
  values,
  onDimensionsChange,
  onAssetPathChange,
}: FixturePropertiesPanelProperties) => {
  const { t } = useTranslation();
  const [uploadingKind, setUploadingKind] = useState<FixtureAssetKind | null>(null);

  const uploadAsset = async (kind: FixtureAssetKind, file: File | null) => {
    if (!file) {
      return;
    }
    setUploadingKind(kind);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(fixtureAssetUploadUrl(fixturePublicId, kind), { method: 'POST', body });
      if (!response.ok) {
        throw new Error('upload failed');
      }
      const payload = (await response.json()) as { path: string };
      onAssetPathChange(kind, payload.path);
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureProperties.assets.uploadError', defaultMessage: 'Failed to upload asset' }),
      });
    } finally {
      setUploadingKind(null);
    }
  };

  const clearAsset = async (kind: FixtureAssetKind) => {
    setUploadingKind(kind);
    try {
      const response = await fetch(fixtureAssetUploadUrl(fixturePublicId, kind), { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('delete failed');
      }
      onAssetPathChange(kind, null);
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'FixtureProperties.assets.uploadError', defaultMessage: 'Failed to upload asset' }),
      });
    } finally {
      setUploadingKind(null);
    }
  };

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <Title order={3}>{t({ id: 'FixtureProperties.dimensions', defaultMessage: 'Dimensions' })}</Title>
        <Group grow gap="xs" align="flex-start">
          <NumberInput
            label={t({ id: 'FixtureProperties.dimensions.weight', defaultMessage: 'Weight' })}
            suffix=" kg"
            hideControls
            min={0}
            max={10000}
            decimalScale={2}
            value={values.weight ?? ''}
            onChange={value => {
              if (value === '') {
                onDimensionsChange({ ...values, weight: null });
                return;
              }
              const next = toFiniteNumber(value);
              if (next !== undefined) {
                onDimensionsChange({ ...values, weight: next });
              }
            }}
          />
          <NumberInput
            label={t({ id: 'FixtureProperties.dimensions.width', defaultMessage: 'Width' })}
            suffix=" m"
            hideControls
            min={0.001}
            max={100}
            decimalScale={3}
            value={values.width ?? ''}
            onChange={value => {
              if (value === '') {
                onDimensionsChange({ ...values, width: null });
                return;
              }
              const next = toFiniteNumber(value);
              if (next !== undefined) {
                onDimensionsChange({ ...values, width: next });
              }
            }}
          />
          <NumberInput
            label={t({ id: 'FixtureProperties.dimensions.length', defaultMessage: 'Length' })}
            suffix=" m"
            hideControls
            min={0.001}
            max={100}
            decimalScale={3}
            value={values.length ?? ''}
            onChange={value => {
              if (value === '') {
                onDimensionsChange({ ...values, length: null });
                return;
              }
              const next = toFiniteNumber(value);
              if (next !== undefined) {
                onDimensionsChange({ ...values, length: next });
              }
            }}
          />
          <NumberInput
            label={t({ id: 'FixtureProperties.dimensions.height', defaultMessage: 'Height' })}
            suffix=" m"
            hideControls
            min={0.001}
            max={100}
            decimalScale={3}
            value={values.height ?? ''}
            onChange={value => {
              if (value === '') {
                onDimensionsChange({ ...values, height: null });
                return;
              }
              const next = toFiniteNumber(value);
              if (next !== undefined) {
                onDimensionsChange({ ...values, height: next });
              }
            }}
          />
        </Group>
      </Stack>

      <Stack gap="md">
        <Title order={3}>{t({ id: 'FixtureProperties.assets', defaultMessage: 'Assets' })}</Title>
        <AssetRow
          label={t({ id: 'FixtureProperties.assets.picture', defaultMessage: 'Picture' })}
          accept="image/jpeg,image/png,image/webp"
          uploading={uploadingKind === 'picture'}
          preview={
            <Image
              src={fixtureAssetDisplayUrl(values.picturePath, FIXTURE_DEFAULT_PICTURE_PATH)}
              alt={t({ id: 'FixtureProperties.assets.picture', defaultMessage: 'Picture' })}
              h={160}
              fit="contain"
            />
          }
          onUpload={file => void uploadAsset('picture', file)}
          onClear={() => void clearAsset('picture')}
          canClear={values.picturePath !== null}
        />
        <AssetRow
          label={t({ id: 'FixtureProperties.assets.picture2d', defaultMessage: '2D picture' })}
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          uploading={uploadingKind === 'picture2d'}
          preview={
            <Image
              src={fixtureAssetDisplayUrl(values.picture2dPath, FIXTURE_DEFAULT_PICTURE_2D_PATH)}
              alt={t({ id: 'FixtureProperties.assets.picture2d', defaultMessage: '2D picture' })}
              h={160}
              fit="contain"
            />
          }
          onUpload={file => void uploadAsset('picture2d', file)}
          onClear={() => void clearAsset('picture2d')}
          canClear={values.picture2dPath !== null}
        />
        <AssetRow
          label={t({ id: 'FixtureProperties.assets.model3d', defaultMessage: '3D model' })}
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          uploading={uploadingKind === 'model3d'}
          preview={
            <FixtureModelPreview url={fixtureAssetDisplayUrl(values.model3dPath, FIXTURE_DEFAULT_MODEL_3D_PATH)} />
          }
          onUpload={file => void uploadAsset('model3d', file)}
          onClear={() => void clearAsset('model3d')}
          canClear={values.model3dPath !== null}
        />
      </Stack>
    </Stack>
  );
};

type AssetRowProperties = {
  label: string;
  accept: string;
  uploading: boolean;
  preview: ReactNode;
  canClear: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
};

const AssetRow = ({ label, accept, uploading, preview, canClear, onUpload, onClear }: AssetRowProperties) => {
  const { t } = useTranslation();
  return (
    <Stack gap="xs">
      <Text fw={500}>{label}</Text>
      {preview}
      <Group gap="xs">
        <FileButton onChange={onUpload} accept={accept}>
          {props => (
            <Button
              {...props}
              variant="light"
              leftSection={<UploadSimpleIcon size={ICON_SIZE} weight="duotone" />}
              loading={uploading}
            >
              {t({ id: 'FixtureProperties.assets.upload', defaultMessage: 'Upload' })}
            </Button>
          )}
        </FileButton>
        <Button
          variant="subtle"
          color="red"
          leftSection={<TrashIcon size={ICON_SIZE} weight="duotone" />}
          disabled={!canClear || uploading}
          onClick={onClear}
        >
          {t({ id: 'FixtureProperties.assets.clear', defaultMessage: 'Use default' })}
        </Button>
      </Group>
    </Stack>
  );
};

export default FixtureProperties;
