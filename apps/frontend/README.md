# Frontend project

This project contains the frontend code for the DMX Light Control application. It is a Next.js App Router app (port **3001**) for fixture, fixture-vendor, and project management; it talks to the backend GraphQL API.

## Development setup

Copy `.env.example` to `.env`. The only variable is `NEXT_PUBLIC_GRAPHQL_API_URL` (default `http://localhost:3000/graphql`). The backend must be reachable for GraphQL codegen.

Locale routing uses `src/proxy.ts` (Next.js 16 proxy; there is no `middleware.ts`) with `next-i18n-router`. URLs are prefixed (`/de/...`, `/en/...`); default locale is `de`.

`nx dev frontend` runs `next dev --webpack` (not Turbopack).

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

Unit and component tests (Vitest, colocated under `src/` as `*.spec.ts` / `*.spec.tsx`). Coverage reports go to `coverage/apps/frontend`:

```bash
nx test frontend
nx test frontend --coverage
```

Browser e2e (Playwright, mocked GraphQL, no backend required). Install Chromium once with `pnpm exec playwright install chromium`:

```bash
nx e2e frontend
```

To extract translation keys from the source code and update the translation files, run the following command:

```bash
nx run frontend:i18n-extract
```

To verify that translation files are in sync (missing and extra keys), run:

```bash
nx run frontend:i18n-verify
```

To generate TypeScript types for the GraphQL schema (`src/**/*.graphql` → `src/shared/types/graphql/`), run:

```bash
nx run frontend:graphql-codegen
```
