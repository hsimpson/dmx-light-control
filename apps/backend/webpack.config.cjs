const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

// Export a function so the @nx/webpack:webpack executor can pass its options
// (including `watch: true`) into the config. When the config is an object,
// the executor ignores the watch option and webpack always exits after one build,
// causing @nx/js:node to restart in an infinite loop.
module.exports = function webpackConfig(config, { options } = {}) {
  const isDevMode = process.env.NODE_ENV !== 'production';

  config.output = {
    path: join(__dirname, '../../dist/apps/backend'),
    // clean only for production — in dev/watch mode, cleaning deletes output
    // files before they're rewritten, which can confuse file watchers
    clean: !isDevMode,
    ...(isDevMode && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  };

  // Propagate the watch option from the executor so webpack stays running
  // in watch mode and emits an event on each recompile
  if (options?.watch) {
    config.watch = true;
  }

  config.plugins = [
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

  return config;
};
