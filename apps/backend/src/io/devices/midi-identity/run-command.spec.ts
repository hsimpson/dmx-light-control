import { describe, expect, it } from 'vitest';
import { runCommand } from './run-command';

describe('runCommand', () => {
  it('GIVEN arguments with shell metacharacters WHEN run THEN passed literally and stdout returned', async () => {
    const output = await runCommand(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', '$(echo hi);|']);

    expect(output).toBe('$(echo hi);|');
  });

  it('GIVEN a failing command WHEN run THEN rejects', async () => {
    await expect(runCommand(process.execPath, ['-e', 'process.exit(3)'])).rejects.toThrow();
  });
});
