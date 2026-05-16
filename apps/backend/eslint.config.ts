import rootConfig from '../../eslint.config.ts';

export default [
  ...rootConfig,

  // CJS config files are not part of any tsconfig project
  {
    ignores: ['webpack.config.cjs'],
  },

  {
    rules: {
      // NestJS uses decorator-only classes (modules, controllers, services)
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
