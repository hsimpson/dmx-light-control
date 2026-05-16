import rootConfig from '../../eslint.config.ts';

export default [
  ...rootConfig,

  // CJS config files are not part of any tsconfig project
  {
    ignores: ['jest.config.cts'],
  },
];
