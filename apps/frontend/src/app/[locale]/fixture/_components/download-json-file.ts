export function downloadJsonFile(filename: string, data: unknown): void {
  const json = JSON.stringify(data, (key, value: unknown) => (key === '__typename' ? undefined : value), 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
