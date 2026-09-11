import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverCoverageInputs, mergeCoverageReports, writeMergedCoverageReports } from './merge-vitest-coverage.mjs';

function createFileCoverage(filePath, coveredStatements, totalStatements) {
  const statementMap = {};
  const s = {};

  for (let index = 0; index < totalStatements; index++) {
    statementMap[String(index)] = {
      start: { line: index + 1, column: 0 },
      end: { line: index + 1, column: 1 },
    };
    s[String(index)] = index < coveredStatements ? 1 : 0;
  }

  return {
    path: filePath,
    statementMap,
    fnMap: {},
    branchMap: {},
    s,
    f: {},
    b: {},
  };
}

describe('mergeCoverageReports', () => {
  it('merges coverage-final maps from multiple inputs', () => {
    const merged = mergeCoverageReports([
      {
        '/repo/apps/backend/src/a.ts': createFileCoverage('/repo/apps/backend/src/a.ts', 2, 2),
      },
      {
        '/repo/apps/frontend/src/b.tsx': createFileCoverage('/repo/apps/frontend/src/b.tsx', 1, 2),
      },
    ]);

    expect(Object.keys(merged.final)).toEqual(['/repo/apps/backend/src/a.ts', '/repo/apps/frontend/src/b.tsx']);
    expect(merged.summary.total.statements.pct).toBe(75);
    expect(merged.summary['/repo/apps/backend/src/a.ts'].statements.pct).toBe(100);
    expect(merged.summary['/repo/apps/frontend/src/b.tsx'].statements.pct).toBe(50);
  });
});

describe('writeMergedCoverageReports', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'merge-vitest-coverage-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes coverage-final.json and coverage-summary.json for the action', async () => {
    const outputDir = join(tempDir, 'coverage');

    await writeMergedCoverageReports({
      inputs: [
        {
          '/repo/apps/backend/src/a.ts': createFileCoverage('/repo/apps/backend/src/a.ts', 1, 1),
        },
      ],
      outputDir,
    });

    const final = JSON.parse(await readFile(join(outputDir, 'coverage-final.json'), 'utf8'));
    const summary = JSON.parse(await readFile(join(outputDir, 'coverage-summary.json'), 'utf8'));

    expect(final['/repo/apps/backend/src/a.ts'].path).toBe('/repo/apps/backend/src/a.ts');
    expect(summary.total.statements.pct).toBe(100);
    expect(summary['/repo/apps/backend/src/a.ts'].lines.pct).toBe(100);
  });
});

describe('discoverCoverageInputs', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'merge-vitest-coverage-discover-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('finds per-project coverage-final.json files under coverage/apps and coverage/tools', async () => {
    const backendDir = join(tempDir, 'coverage', 'apps', 'backend');
    const frontendDir = join(tempDir, 'coverage', 'apps', 'frontend');
    const brunoDir = join(tempDir, 'coverage', 'tools', 'bruno');

    await mkdir(backendDir, { recursive: true });
    await mkdir(frontendDir, { recursive: true });
    await mkdir(brunoDir, { recursive: true });

    const backendCoverage = { '/repo/a.ts': createFileCoverage('/repo/a.ts', 1, 1) };
    const frontendCoverage = { '/repo/b.ts': createFileCoverage('/repo/b.ts', 1, 1) };

    await writeFile(join(backendDir, 'coverage-final.json'), JSON.stringify(backendCoverage));
    await writeFile(join(frontendDir, 'coverage-final.json'), JSON.stringify(frontendCoverage));
    await writeFile(join(brunoDir, 'coverage-final.json'), JSON.stringify({}));

    const inputs = await discoverCoverageInputs(tempDir);

    expect(inputs).toHaveLength(3);
    expect(inputs[0]).toEqual(backendCoverage);
    expect(inputs[1]).toEqual(frontendCoverage);
    expect(inputs[2]).toEqual({});
  });
});
