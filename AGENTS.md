# AGENTS.md — dmx-light-control

## Quick start

```bash
# global prerequisite (not in repo)
npm install -g nx
pnpm install

# copy environment files
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env

# start database and run backend + frontend concurrently
nx run infra:db-start
nx run backend:drizzle-migrate
nx run backend:drizzle-seed
nx serve backend      # also starts infra:db-start automatically
nx run frontend:dev   # port 3001
```

## Architecture

- **Nx monorepo** (pnpm workspaces, default branch `main`). Four projects under `apps/` and `tools/`.
- **`apps/backend`** — NestJS (Fastify, Apollo GraphQL, Drizzle ORM + PostgreSQL). Webpack-bundled, target `node`. Uses `nest-commander` — CLI commands (`dmx-sniffer`) run via `node main.js <command>`. Schema in `src/db/schema.ts`, migrations in `src/db/migrations/`.
- **`apps/frontend`** — Next.js 16 (app router, SWC) + Mantine UI v9. GraphQL codegen with client-preset (fragment masking disabled). i18n via `react-intl`/`formatjs`, routing via `next-i18n-router`.
- **`infra/`** — Docker Compose for PostgreSQL 18. `docker compose --env-file ../.env up -d --wait`.
- **`tools/bruno/`** — Generates Bruno API collections from GraphQL schema.
- **No test files** found in the repo (`*.spec.ts`, `*.test.ts`, test configs all absent).

## Nx targets per project

```bash
# infra
nx run infra:db-start   # docker compose up -d --wait
nx run infra:db-stop
nx run infra:db-reset   # down -v (destroys volumes)
nx run infra:db-logs

# backend
nx serve backend              # builds + watches + starts, auto-depends on infra:db-start
nx run backend:build
nx run backend:drizzle-generate -- --name <migration_name>
nx run backend:drizzle-migrate
nx run backend:drizzle-seed   # uses tsx runner
nx run backend:drizzle-studio
nx run backend:dmx-sniffer -- --bus <num> --address <addr>  # Linux-only, requires usbmon

# frontend
nx run frontend:dev           # port 3001
nx run frontend:build
nx run frontend:start         # production, port 3001
nx run frontend:typecheck
nx run frontend:extract-i18n
nx run frontend:graphql-codegen

# bruno
nx run bruno:build            # tsx create-collection.ts
```

## Key commands

| Command                           | Notes                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `nx lint`                         | Runs ESLint on all projects (Nx parallel). Config at root `eslint.config.ts`.                                               |
| `nx serve backend`                | Auto-starts DB via infra `db-start`. Builds with webpack + watch.                                                           |
| `nx run frontend:typecheck`       | `tsc --noEmit` for frontend only (no root-level typecheck target).                                                          |
| `nx run frontend:graphql-codegen` | Requires running backend (fetches schema from `NEXT_PUBLIC_GRAPHQL_API_URL`). Outputs types to `src/shared/types/graphql/`. |
| `nx run frontend:extract-i18n`    | Extracts formatjs messages to `src/lang/en.json`.                                                                           |

## Style & conventions

- **ESLint**: strict-type-checked + stylistic-type-checked. Key rules: `explicit-member-accessibility: error`, `member-ordering: error`, `promise-function-async: error`, `require-await: error`, `no-console: warn`. Root config in `eslint.config.ts`, backend override in `apps/backend/eslint.config.ts`, frontend in `apps/frontend/eslint.config.ts`.
- **Prettier**: `arrowParens: "avoid"`, `printWidth: 120`, `singleQuote: true`, `trailingComma: "all"`. Config in `prettier.config.ts`.
- **Editor**: Format on save. 2-space tabs. Recommended extensions in `.vscode/extensions.json`.

## Environment

- **Root `.env`**: `BACKEND_PORT`, `POSTGRES_*` vars. Backend loads via `@nestjs/config` with `expandVariables: true`.
- **Frontend `.env`** (`apps/frontend/.env`): `NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:3000/graphql`.
- `.env` is gitignored. Both `.env.example` files are checked in.
- Local `.env` uses `POSTGRES_PORT=5433` (not the default 5432).

## Database

- PostgreSQL managed via Docker Compose. Drizzle ORM with `snake_case` casing and timestamp-prefixed migrations.
- Drizzle config at `apps/backend/src/db/drizzle.config.ts`.
- Migration/seed commands must be run from workspace root via Nx (they use `cwd: {projectRoot}`).
- Seed script at `src/db/seeding/seed.ts`, uses `tsx` runner.

## pnpm quirk

`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days). pnpm will refuse to install packages published less than 7 days ago. If a dependency install fails with a "too young" error, either wait or temporarily lower this value.

## Debugging backend

Launch config in `.vscode/launch.json` uses `pnpm exec nx serve backend` with `--inspect=9229`.

## GraphQL codegen

Frontend codegen (`codegen.ts`) uses env `NEXT_PUBLIC_GRAPHQL_API_URL`, output client-preset types to `src/shared/types/graphql/`. Schema documents are `*.graphql` files under `src/`. Fragment masking is disabled.

## i18n

- Source language: English. Locale files in `apps/frontend/src/lang/`.
- Middleware at `apps/frontend/src/proxy.ts` (exported as `proxy`, not `middleware`) handles locale routing via `next-i18n-router`.
- Translation extraction: `nx run frontend:extract-i18n`.

## DMX Sniffer (Linux only)

Requires `usbmon` kernel module. Run `sudo modprobe usbmon`, find device with `lsusb`, then `nx run backend:dmx-sniffer -- --bus <num> --address <addr>`.
