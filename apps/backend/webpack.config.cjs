const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

/** Known webpack config options (webpack CLI schema) */
const VALID_WEBPACK_OPTIONS = new Set([
  'amd', 'bail', 'cache', 'context', 'dependencies', 'devServer', 'devtool',
  'dotenv', 'entry', 'experiments', 'extends', 'externals', 'externalsPresets',
  'externalsType', 'ignoreWarnings', 'infrastructureLogging', 'loader', 'mode',
  'module', 'name', 'node', 'optimization', 'output', 'parallelism', 'performance',
  'plugins', 'profile', 'recordsInputPath', 'recordsOutputPath', 'recordsPath',
  'resolve', 'resolveLoader', 'snapshot', 'stats', 'target', 'validate', 'watch',
  'watchOptions',
]);

module.exports = function webpackConfig(config, { options } = {}) {
  /** @type {import('webpack').Configuration} */
  const mergedConfig = { ...config };

  // Filter out unknown properties from the inferred plugin's options
  for (const key of Object.keys(mergedConfig)) {
    if (!VALID_WEBPACK_OPTIONS.has(key)) {
      delete mergedConfig[key];
    }
  }

  const isDevMode = process.env.NODE_ENV !== 'production';

  mergedConfig.output = {
    path: join(__dirname, '../../dist/apps/backend'),
    clean: !isDevMode,
    ...(isDevMode && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  };

  mergedConfig.plugins = [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
  ];

  return mergedConfig;
};
