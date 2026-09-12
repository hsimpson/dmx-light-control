'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ActionIcon,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ArrowsOutIcon, ExportIcon } from '@phosphor-icons/react';
import type {
  VirtualConsoleControl,
  VirtualConsoleControlType,
  VirtualConsoleDocument,
  VirtualConsolePage,
} from './virtual-console-document';
import { VIRTUAL_CONSOLE_PALETTE_MIME } from './virtual-console-document';
import classes from './virtual-console-view.module.css';

const SIZE_MIN = 8;
const SIZE_MAX = 4096;

export type VirtualConsoleSelection =
  { kind: 'canvas' } | { kind: 'page'; pageId: string } | { kind: 'control'; controlId: string };

type VirtualConsoleSidebarProperties = {
  document: VirtualConsoleDocument;
  mode: 'edit' | 'play';
  selection: VirtualConsoleSelection;
  selectedPage: VirtualConsolePage | undefined;
  selectedControl: VirtualConsoleControl | undefined;
  dirty: boolean;
  saving: boolean;
  onSelectCanvas: () => void;
  onCanvasSizeChange: (field: 'width' | 'height', value: number) => void;
  onPageNameChange: (name: string) => void;
  onControlPatch: (patch: Partial<VirtualConsoleControl>) => void;
  onSave: () => void;
  onPopOut?: () => void;
  onFullscreen?: () => void;
};

function toFiniteNumber(value: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const PaletteItem = ({ type, label }: { type: VirtualConsoleControlType; label: string }) => {
  return (
    <UnstyledButton
      className={classes.paletteItem}
      draggable
      onDragStart={event => {
        event.dataTransfer.setData(VIRTUAL_CONSOLE_PALETTE_MIME, type);
        event.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <Paper withBorder p="xs">
        <Text size="sm">{label}</Text>
      </Paper>
    </UnstyledButton>
  );
};

const VirtualConsoleSidebar = ({
  document,
  mode,
  selection,
  selectedPage,
  selectedControl,
  dirty,
  saving,
  onSelectCanvas,
  onCanvasSizeChange,
  onPageNameChange,
  onControlPatch,
  onSave,
  onPopOut,
  onFullscreen,
}: VirtualConsoleSidebarProperties) => {
  const { t } = useTranslation();

  if (mode === 'play') {
    return (
      <Paper className={classes.panel} p="md" w={260} withBorder>
        <Stack>
          {onFullscreen ? (
            <Button leftSection={<ArrowsOutIcon weight="duotone" />} onClick={onFullscreen} variant="light">
              {t({ id: 'ProjectDetail.virtualConsole.fullscreen', defaultMessage: 'Fullscreen' })}
            </Button>
          ) : null}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper className={classes.panel} p="md" w={280} withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>{t({ id: 'ProjectDetail.virtualConsole.panelTitle', defaultMessage: 'Console' })}</Title>
          {onPopOut ? (
            <ActionIcon
              aria-label={t({ id: 'ProjectDetail.virtualConsole.popOut', defaultMessage: 'Pop out' })}
              onClick={onPopOut}
              variant="subtle"
            >
              <ExportIcon weight="duotone" />
            </ActionIcon>
          ) : null}
        </Group>

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {t({ id: 'ProjectDetail.virtualConsole.palette', defaultMessage: 'Add control' })}
          </Text>
          <PaletteItem
            type="frame"
            label={t({ id: 'ProjectDetail.virtualConsole.control.frame', defaultMessage: 'Frame' })}
          />
          <PaletteItem
            type="slider"
            label={t({ id: 'ProjectDetail.virtualConsole.control.slider', defaultMessage: 'Slider' })}
          />
          <PaletteItem
            type="button"
            label={t({ id: 'ProjectDetail.virtualConsole.control.button', defaultMessage: 'Button' })}
          />
        </Stack>

        <UnstyledButton onClick={onSelectCanvas}>
          <Text size="sm" fw={600}>
            {t({ id: 'ProjectDetail.virtualConsole.canvas', defaultMessage: 'Canvas' })}
          </Text>
        </UnstyledButton>
        {(selection.kind === 'canvas' || selection.kind === 'page') && (
          <Group grow>
            <NumberInput
              hideControls
              label={t({ id: 'ProjectDetail.virtualConsole.width', defaultMessage: 'Width' })}
              max={SIZE_MAX}
              min={1}
              value={document.width}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  onCanvasSizeChange('width', next);
                }
              }}
            />
            <NumberInput
              hideControls
              label={t({ id: 'ProjectDetail.virtualConsole.height', defaultMessage: 'Height' })}
              max={SIZE_MAX}
              min={1}
              value={document.height}
              onChange={value => {
                const next = toFiniteNumber(value);
                if (next !== undefined) {
                  onCanvasSizeChange('height', next);
                }
              }}
            />
          </Group>
        )}

        {selectedPage && selection.kind === 'page' ? (
          <TextInput
            label={t({ id: 'ProjectDetail.virtualConsole.pageName', defaultMessage: 'Page name' })}
            value={selectedPage.name}
            onChange={event => {
              onPageNameChange(event.currentTarget.value);
            }}
          />
        ) : null}

        {selectedControl ? <ControlFields control={selectedControl} onPatch={onControlPatch} /> : null}

        <Button disabled={!dirty} loading={saving} onClick={onSave}>
          {t(globalMessages.save)}
        </Button>
      </Stack>
    </Paper>
  );
};

type ControlFieldsProperties = {
  control: VirtualConsoleControl;
  onPatch: (patch: Partial<VirtualConsoleControl>) => void;
};

const ControlFields = ({ control, onPatch }: ControlFieldsProperties) => {
  const { t } = useTranslation();
  return (
    <Stack gap="xs">
      <TextInput
        label={t({ id: 'ProjectDetail.virtualConsole.label', defaultMessage: 'Label' })}
        value={control.label}
        onChange={event => {
          onPatch({ label: event.currentTarget.value });
        }}
      />
      <Group grow>
        <NumberInput
          hideControls
          label={t({ id: 'ProjectDetail.virtualConsole.x', defaultMessage: 'X' })}
          value={control.x}
          onChange={value => {
            const next = toFiniteNumber(value);
            if (next !== undefined) {
              onPatch({ x: next });
            }
          }}
        />
        <NumberInput
          hideControls
          label={t({ id: 'ProjectDetail.virtualConsole.y', defaultMessage: 'Y' })}
          value={control.y}
          onChange={value => {
            const next = toFiniteNumber(value);
            if (next !== undefined) {
              onPatch({ y: next });
            }
          }}
        />
      </Group>
      <Group grow>
        <NumberInput
          hideControls
          label={t({ id: 'ProjectDetail.virtualConsole.width', defaultMessage: 'Width' })}
          max={SIZE_MAX}
          min={SIZE_MIN}
          value={control.width}
          onChange={value => {
            const next = toFiniteNumber(value);
            if (next !== undefined) {
              onPatch({ width: next });
            }
          }}
        />
        <NumberInput
          hideControls
          label={t({ id: 'ProjectDetail.virtualConsole.height', defaultMessage: 'Height' })}
          max={SIZE_MAX}
          min={SIZE_MIN}
          value={control.height}
          onChange={value => {
            const next = toFiniteNumber(value);
            if (next !== undefined) {
              onPatch({ height: next });
            }
          }}
        />
      </Group>
      <ColorInput
        format="hex"
        label={t({ id: 'ProjectDetail.virtualConsole.backgroundColor', defaultMessage: 'Background' })}
        value={control.backgroundColor}
        onChange={value => {
          onPatch({ backgroundColor: value });
        }}
      />
      {control.type === 'frame' ? (
        <>
          <NumberInput
            hideControls
            label={t({ id: 'ProjectDetail.virtualConsole.borderWidth', defaultMessage: 'Border width' })}
            max={32}
            min={0}
            value={control.borderWidth ?? 0}
            onChange={value => {
              const next = toFiniteNumber(value);
              if (next !== undefined) {
                onPatch({ borderWidth: next });
              }
            }}
          />
          <ColorInput
            format="hex"
            label={t({ id: 'ProjectDetail.virtualConsole.borderColor', defaultMessage: 'Border color' })}
            value={control.borderColor ?? '#000000'}
            onChange={value => {
              onPatch({ borderColor: value });
            }}
          />
        </>
      ) : null}
      {control.type === 'slider' || control.type === 'button' ? (
        <ColorInput
          format="hex"
          label={t({ id: 'ProjectDetail.virtualConsole.foregroundColor', defaultMessage: 'Foreground' })}
          value={control.foregroundColor ?? '#ffffff'}
          onChange={value => {
            onPatch({ foregroundColor: value });
          }}
        />
      ) : null}
      {control.type === 'slider' ? (
        <>
          <Select
            allowDeselect={false}
            data={[
              {
                value: 'vertical',
                label: t({ id: 'ProjectDetail.virtualConsole.vertical', defaultMessage: 'Vertical' }),
              },
              {
                value: 'horizontal',
                label: t({ id: 'ProjectDetail.virtualConsole.horizontal', defaultMessage: 'Horizontal' }),
              },
            ]}
            label={t({ id: 'ProjectDetail.virtualConsole.orientation', defaultMessage: 'Orientation' })}
            value={control.orientation ?? 'vertical'}
            onChange={value => {
              if (value === 'vertical' || value === 'horizontal') {
                onPatch({ orientation: value });
              }
            }}
          />
          <Select
            allowDeselect={false}
            data={[
              {
                value: 'dmx',
                label: t({ id: 'ProjectDetail.virtualConsole.valueTypeDmx', defaultMessage: 'DMX' }),
              },
              {
                value: 'percentage',
                label: t({
                  id: 'ProjectDetail.virtualConsole.valueTypePercentage',
                  defaultMessage: 'Percentage',
                }),
              },
            ]}
            label={t({ id: 'ProjectDetail.virtualConsole.valueType', defaultMessage: 'Value type' })}
            value={control.valueType ?? 'dmx'}
            onChange={value => {
              if (value === 'dmx' || value === 'percentage') {
                onPatch({ valueType: value });
              }
            }}
          />
        </>
      ) : null}
    </Stack>
  );
};

export default VirtualConsoleSidebar;
