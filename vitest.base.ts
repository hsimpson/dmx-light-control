import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: [['text', { skipFull: false }], 'html', 'json', 'clover'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [...coverageConfigDefaults.exclude, 'src/**/*.dto.ts'],
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
        branches: 80,
      },
    },
  },
});
