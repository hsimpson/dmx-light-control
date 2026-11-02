import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const COMMAND_TIMEOUT_MS = 3000;
const COMMAND_MAX_OUTPUT_BYTES = 1024 * 1024;

const execFileAsync = promisify(execFile);

/** Runs a fixed command without a shell; rejects on non-zero exit, timeout or oversized output. */
export async function runCommand(file: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync(file, args, {
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: COMMAND_MAX_OUTPUT_BYTES,
    windowsHide: true,
  });
  return stdout;
}
