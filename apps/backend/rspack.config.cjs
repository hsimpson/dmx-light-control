const { NxAppRspackPlugin } = require('@nx/rspack/app-plugin');
const { join } = require('node:path');

const isDevMode = process.env.NODE_ENV !== 'production';

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
      assets: ['./src/assets'],
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
