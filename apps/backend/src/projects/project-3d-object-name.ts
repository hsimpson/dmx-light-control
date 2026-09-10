import { InvalidProject3dObjectNameException } from './project.exceptions';

export function nextUniqueSceneObjectName(
  typeName: string,
  existingOfTypeCount: number,
  existingNames: string[],
): string {
  const taken = new Set(existingNames);
  let n = existingOfTypeCount + 1;
  let candidate = `${typeName} ${n}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${typeName} ${n}`;
  }
  return candidate;
}

export function normalizeSceneObjectName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.length > 255) {
    throw new InvalidProject3dObjectNameException();
  }
  return normalized;
}
