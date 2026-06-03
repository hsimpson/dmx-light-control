import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  eslintReact.configs['strict-type-checked'],
  reactHooks.configs.flat.recommended,

  {
    ignores: [
      '.next/**/*',
      'src/shared/types/graphql/**/*',
      'next-env.d.ts',
      'postcss.config.cjs',
    ],
  },

  // custom ESLint React rules
  {
    rules: {},
  },

  // eslint-plugin-react-hooks
  {
    rules: {},
  },
];
