export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
    sorted[key] = sortJsonKeys(value[key]);
  }
  return sorted;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const json = JSON.stringify(
    sortJsonKeys(data),
    (key, value: unknown) => (key === '__typename' ? undefined : value),
    2,
  );
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
