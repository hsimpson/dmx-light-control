const { NxAppRspackPlugin } = require('@nx/rspack/app-plugin');
const { join } = require('node:path');

const isDevMode = process.env.NODE_ENV !== 'production';

// In watch mode, CopyRspackPlugin watches `assets`. Writing uploaded fixture files
// under src/assets/fixtures/<vendor>/<fixture>/ would otherwise rebuild and kill Nest,
// so GraphQL (e.g. updateFixture) fails with "Failed to fetch". Fastify already serves
// src/assets directly during `nx serve`. Production still copies the full tree into dist.
const assetCopyPatterns = isDevMode
  ? [
      { glob: '3d/**/*', input: './src/assets', output: 'assets' },
      { glob: 'fixtures/_defaults/**/*', input: './src/assets', output: 'assets' },
    ]
  : ['./src/assets'];

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/backend'),
    clean: !isDevMode,
    filename: '[name].js',
    ...(isDevMode && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppRspackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: assetCopyPatterns,
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
      outputFileName: 'main.js',
      // Nx 23.2 defaults cache to `true`; Rspack 2 treats that as persistent cache and crashes.
      cache: false,
    }),
  ],
};
