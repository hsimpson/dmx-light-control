import 'dotenv/config';
import type { IGraphQLConfig } from 'graphql-config';

const graphqlApiUrl = process.env.GRAPHQL_API_URL;
if (!graphqlApiUrl) {
  throw new Error(
    'GRAPHQL_API_URL is not defined in the environment variables',
  );
}

const config: IGraphQLConfig = {
  schema: graphqlApiUrl,
  documents: 'src/**/*.{graphql,js,ts,jsx,tsx}',
};

export default config;
