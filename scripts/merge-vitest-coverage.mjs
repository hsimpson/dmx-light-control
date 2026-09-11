import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import libCoverage from 'istanbul-lib-coverage';

const { createCoverageMap } = libCoverage;

const COVERAGE_FINAL_FILE = 'coverage-final.json';
const COVERAGE_SUMMARY_FILE = 'coverage-summary.json';

/**
 * @param {string} workspaceRoot
 * @returns {Promise<string[]>}
 */
async function listCoverageDirectories(workspaceRoot) {
  const coverageRoot = join(workspaceRoot, 'coverage');
  const directories = [];

  for (const group of ['apps', 'tools']) {
    const groupDir = join(coverageRoot, group);

    let entries;
    try {
      entries = await readdir(groupDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push(join(groupDir, entry.name));
      }
    }
  }

  return directories.sort();
}

/**
 * @param {string} directory
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function readCoverageFinal(directory) {
  const filePath = join(directory, COVERAGE_FINAL_FILE);

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }

    throw new Error(`expected an object in ${filePath}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

/**
 * @param {string} workspaceRoot
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function discoverCoverageInputs(workspaceRoot) {
  const directories = await listCoverageDirectories(workspaceRoot);
  const inputs = [];

  for (const directory of directories) {
    const coverage = await readCoverageFinal(directory);

    if (coverage) {
      inputs.push(coverage);
    }
  }

  return inputs;
}

/**
 * @param {Record<string, unknown>[]} inputs
 * @returns {{ final: Record<string, unknown>, summary: Record<string, unknown> }}
 */
export function mergeCoverageReports(inputs) {
  const map = createCoverageMap();

  for (const input of inputs) {
    map.merge(createCoverageMap(input));
  }

  const final = map.toJSON();
  const summary = createCoverageSummary(map);

  return { final, summary };
}

/**
 * @param {import('istanbul-lib-coverage').CoverageMap} map
 * @returns {Record<string, unknown>}
 */
function createCoverageSummary(map) {
  const summary = { total: map.getCoverageSummary().toJSON() };

  for (const file of map.files()) {
    summary[file] = map.fileCoverageFor(file).toSummary().toJSON();
  }

  return summary;
}

/**
 * @param {{ inputs: Record<string, unknown>[], outputDir: string }} options
 * @returns {Promise<void>}
 */
export async function writeMergedCoverageReports({ inputs, outputDir }) {
  const { final, summary } = mergeCoverageReports(inputs);

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, COVERAGE_FINAL_FILE), `${JSON.stringify(final)}\n`, 'utf8');
  await writeFile(join(outputDir, COVERAGE_SUMMARY_FILE), `${JSON.stringify(summary, null, 0)}\n`, 'utf8');
}

/**
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function runCli(args) {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let outputDir = join(workspaceRoot, 'coverage');
  const inputDirectories = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--out-dir') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('missing value for --out-dir');
      }

      outputDir = resolve(workspaceRoot, value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`unknown option: ${arg}`);
    }

    inputDirectories.push(resolve(workspaceRoot, arg));
  }

  let inputs;

  if (inputDirectories.length > 0) {
    inputs = [];

    for (const directory of inputDirectories) {
      const coverage = await readCoverageFinal(directory);

      if (coverage) {
        inputs.push(coverage);
      }
    }
  } else {
    inputs = await discoverCoverageInputs(workspaceRoot);
  }

  if (inputs.length === 0) {
    throw new Error(`no ${COVERAGE_FINAL_FILE} files found; run project tests with coverage or pass input directories`);
  }

  await writeMergedCoverageReports({ inputs, outputDir });

  console.log(
    `Merged ${inputs.length} coverage report(s) into ${join(outputDir, COVERAGE_FINAL_FILE)} and ${join(outputDir, COVERAGE_SUMMARY_FILE)}`,
  );
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  runCli(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
