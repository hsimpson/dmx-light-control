import { type Config } from 'prettier';

const config: Config = {
  arrowParens: 'avoid',
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',

  overrides: [
    {
      files: ['**/*.{yml,yaml}'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;
