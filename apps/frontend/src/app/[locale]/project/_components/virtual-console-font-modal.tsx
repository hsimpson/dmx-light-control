'use client';

import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type { VirtualConsoleControl } from './virtual-console-document';
import {
  VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY,
  VIRTUAL_CONSOLE_DEFAULT_FONT_SIZE,
  VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT,
  VIRTUAL_CONSOLE_FONTS,
  VIRTUAL_CONSOLE_FONT_SIZES,
  VIRTUAL_CONSOLE_FONT_WEIGHTS,
} from './virtual-console-fonts';

export type VirtualConsoleFontModalProperties = {
  opened: boolean;
  control: VirtualConsoleControl;
  onClose: () => void;
  onApply: (patch: Pick<VirtualConsoleControl, 'fontFamily' | 'fontSize' | 'fontWeight'>) => void;
};

const VirtualConsoleFontModal = ({ opened, control, onClose, onApply }: VirtualConsoleFontModalProperties) => {
  const { t } = useTranslation();
  const [fontFamily, setFontFamily] = useState(control.fontFamily ?? VIRTUAL_CONSOLE_DEFAULT_FONT_FAMILY);
  const [fontSize, setFontSize] = useState(String(control.fontSize ?? VIRTUAL_CONSOLE_DEFAULT_FONT_SIZE));
  const [fontWeight, setFontWeight] = useState(String(control.fontWeight ?? VIRTUAL_CONSOLE_DEFAULT_FONT_WEIGHT));

  const sizeValue = Number(fontSize);
  const weightValue = Number(fontWeight);

  return (
    <Modal
      centered
      opened={opened}
      title={t({ id: 'ProjectDetail.virtualConsole.fontModalTitle', defaultMessage: 'Font' })}
      onClose={onClose}
    >
      <Stack gap="md">
        <Select
          allowDeselect={false}
          data={VIRTUAL_CONSOLE_FONTS.map(font => ({ value: font.value, label: font.label }))}
          label={t({ id: 'ProjectDetail.virtualConsole.fontFamily', defaultMessage: 'Font family' })}
          value={fontFamily}
          onChange={value => {
            if (value) {
              setFontFamily(value);
            }
          }}
        />
        <Select
          allowDeselect={false}
          data={VIRTUAL_CONSOLE_FONT_SIZES.map(size => ({ value: String(size), label: `${size}px` }))}
          label={t({ id: 'ProjectDetail.virtualConsole.fontSize', defaultMessage: 'Font size' })}
          value={fontSize}
          onChange={value => {
            if (value) {
              setFontSize(value);
            }
          }}
        />
        <Select
          allowDeselect={false}
          data={VIRTUAL_CONSOLE_FONT_WEIGHTS.map(weight => ({
            value: String(weight.value),
            label: t({
              id: `ProjectDetail.virtualConsole.fontWeight.${weight.id}`,
              defaultMessage: weight.label,
            }),
          }))}
          label={t({ id: 'ProjectDetail.virtualConsole.fontWeight', defaultMessage: 'Font weight' })}
          value={fontWeight}
          onChange={value => {
            if (value) {
              setFontWeight(value);
            }
          }}
        />
        <Text
          data-testid="virtual-console-font-preview"
          style={{ fontFamily, fontSize: `${sizeValue}px`, fontWeight: weightValue }}
        >
          {control.label || t({ id: 'ProjectDetail.virtualConsole.fontPreviewFallback', defaultMessage: 'Preview' })}
        </Text>
        <Group justify="space-between">
          <Button variant="default" onClick={onClose}>
            {t(globalMessages.cancel)}
          </Button>
          <Button
            data-testid="virtual-console-font-apply"
            onClick={() => {
              onApply({ fontFamily, fontSize: sizeValue, fontWeight: weightValue });
              onClose();
            }}
          >
            {t({ id: 'ProjectDetail.virtualConsole.fontApply', defaultMessage: 'Apply' })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default VirtualConsoleFontModal;
