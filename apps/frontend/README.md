# Frontend project

This project contains the frontend code for the DMX Light Control application. It is built using Next.js and provides a user interface for controlling DMX lights through the backend API.

## Development setup

Copy `.env.example` to `.env` and fill in the required environment variables. At minimum, set `NEXT_PUBLIC_GRAPHQL_API_URL` (backend must be reachable for GraphQL codegen).

The app uses locale-based routing (`/de/...`, `/en/...`); default locale is `de`.

## Commands

Serve the frontend application in development mode (port **3001**):

```bash
nx dev frontend
```

Build the frontend application for production:

```bash
nx build frontend
```

Start the frontend application in production mode (port **3001**):

```bash
nx start frontend
```

Typecheck and lint:

```bash
nx typecheck frontend
nx lint frontend
```

To extract translation keys from the source code and update the translation files, run the following command:

```bash
nx run frontend:i18n-extract
```

To verify that translation files are in sync (missing and extra keys), run:

```bash
nx run frontend:i18n-verify
```

To generate TypeScript types for the GraphQL schema, run the following command:

```bash
nx run frontend:graphql-codegen
```
