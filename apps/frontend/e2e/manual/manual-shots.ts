import { expect, type Locator, type Page, test } from '@playwright/test';
import path from 'node:path';

export const imagePath = (locale: string, name: string) =>
  path.resolve(test.info().project.testDir, '../../../../docs/manual', locale, 'virtual-console/images', name);

const PADDING = 12;

/** Screenshot of the area that covers all given elements, plus a small margin. */
export const shoot = async (page: Page, file: string, locators: Locator[]) => {
  const boxes = await Promise.all(locators.map(async locator => locator.boundingBox()));
  const known = boxes.filter(box => box !== null);
  expect(known).toHaveLength(locators.length);
  const left = Math.max(0, Math.min(...known.map(box => box.x)) - PADDING);
  const top = Math.max(0, Math.min(...known.map(box => box.y)) - PADDING);
  const right = Math.max(...known.map(box => box.x + box.width)) + PADDING;
  const bottom = Math.max(...known.map(box => box.y + box.height)) + PADDING;
  await page.screenshot({ path: file, clip: { x: left, y: top, width: right - left, height: bottom - top } });
};
