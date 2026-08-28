export const CHANNEL_RANGE_DESCRIPTION_MAX_LENGTH = 1024;

const LINE_PATTERN = /^(\d+)\s*-\s*(\d+)\s+(.+)$/;

export type ChannelRangeImportItem = {
  dmxStart: number;
  dmxEnd: number;
  description: string;
};

export type ChannelRangeImportErrorCode = 'invalidFormat' | 'duplicateDescription';

export type ChannelRangeImportError = {
  line: number;
  content: string;
  message: ChannelRangeImportErrorCode;
};

export type ChannelRangeImportResult = {
  ranges: ChannelRangeImportItem[];
  errors: ChannelRangeImportError[];
};

export function parseChannelRangeImport(text: string): ChannelRangeImportResult {
  const ranges: ChannelRangeImportItem[] = [];
  const errors: ChannelRangeImportError[] = [];
  const descriptionsSeen = new Set<string>();

  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const lineContent = lines[index] ?? '';
    const trimmed = lineContent.trim();

    if (!trimmed) {
      continue;
    }

    const match = LINE_PATTERN.exec(trimmed);
    if (!match) {
      errors.push({ line: lineNumber, content: lineContent, message: 'invalidFormat' });
      continue;
    }

    const startText = match[1];
    const endText = match[2];
    const descriptionText = match[3];

    if (!startText || !endText || !descriptionText) {
      errors.push({ line: lineNumber, content: lineContent, message: 'invalidFormat' });
      continue;
    }

    const dmxStart = Number(startText);
    const dmxEnd = Number(endText);
    const description = descriptionText.trim();

    if (
      description === '' ||
      description.length > CHANNEL_RANGE_DESCRIPTION_MAX_LENGTH ||
      dmxStart < 0 ||
      dmxStart > 255 ||
      dmxEnd < 0 ||
      dmxEnd > 255 ||
      dmxStart > dmxEnd
    ) {
      errors.push({ line: lineNumber, content: lineContent, message: 'invalidFormat' });
      continue;
    }

    if (descriptionsSeen.has(description)) {
      errors.push({ line: lineNumber, content: lineContent, message: 'duplicateDescription' });
      continue;
    }

    descriptionsSeen.add(description);
    ranges.push({ dmxStart, dmxEnd, description });
  }

  return { ranges, errors };
}
