import rootConfig from '../../eslint.config.ts';

export default [
  ...rootConfig,

  // Vite/tool config files are not part of any tsconfig project
  {
    ignores: ['vite.config.mts'],
  },
];
