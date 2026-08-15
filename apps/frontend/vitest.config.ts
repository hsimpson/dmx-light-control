import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { coverageConfigDefaults, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    root: import.meta.dirname,
    setupFiles: [resolve(import.meta.dirname, 'vitest.setup.ts')],
    include: ['src/**/*.{spec,test}.{ts,tsx}'],
    coverage: {
      reportsDirectory: '../../coverage/apps/frontend',
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/shared/types/graphql/**',
        'src/shared/types/fixtures.ts',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/proxy.ts',
        '**/*.module.css',
        '**/*.css',
        'src/components/app.tsx',
        'src/components/header.tsx',
        'src/components/navbar.tsx',
        'src/components/theme-toggle.tsx',
        'src/components/language-switcher.tsx',
        'src/components/selectable-list/**',
        'src/lib/graphql/**',
        'src/lib/i18n/intl-wrapper.tsx',
        'src/app/**/fixture-form.tsx',
        'src/app/**/fixture-channel-definitions.tsx',
        'src/app/**/fixture-channel-modes.tsx',
        'src/app/**/fixture-channel-definition-item.tsx',
        'src/app/**/fixture-channel-range-table.tsx',
        'src/app/**/fixture-vendor-table.tsx',
      ],
    },
  },
});
