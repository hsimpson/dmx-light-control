import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,

  {
    ignores: ['.next/**/*', 'src/shared/types/graphql/**/*'],
  },
];
