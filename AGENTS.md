# DMX Lighting Control System

NestJS backend + Next.js frontend in Nx monorepo.

## Agent behavior

- **Think before coding:** State assumptions. If unclear or multi-interpretation, ask. Surface tradeoffs. Push back on overcomplication.
- **Simplicity first:** Minimum code that solves the ask. No speculative features, abstractions, or config. No impossible-scenario error handling. Prefer a small rewrite over a bloated patch.
- **Surgical changes:** Touch only what the task requires. No drive-by refactors or formatting. Match existing style. Mention unrelated dead code; don’t delete it. Remove only orphans your changes created.
- **Goal-driven execution:** Define verifiable success (tests/commands). For multi-step work, brief plan + verify steps; loop until verified.
- **Bias:** Caution over speed except truly trivial tasks.
- **Drizzle migrations:** Never generate with drizzle-kit’s random folder names (e.g. `rapid_beast`). Always ask the user for a new snake_case name first, then run `nx run backend:drizzle-generate -- --name <name>`.

## Commands

| Command                                            | Description                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `nx serve backend`                                 | Backend dev server (also runs `infra:db-start`)                    |
| `nx run infra:db-start`                            | Start local Postgres (Docker)                                      |
| `nx run infra:db-stop`                             | Stop local Postgres                                                |
| `nx run infra:db-reset`                            | Reset local Postgres (removes volumes)                             |
| `nx run infra:db-logs`                             | Tail local Postgres logs                                           |
| `nx dev frontend` / `nx start frontend`            | Frontend Next.js webpack-dev (port 3001) / prod start              |
| `nx build backend/frontend`                        | Production build                                                   |
| `nx typecheck backend/frontend`                    | Type check                                                         |
| `nx lint backend/frontend`                         | Lint                                                               |
| `nx test backend`                                  | Backend unit/integration + e2e tests                               |
| `nx test frontend`                                 | Frontend Vitest unit/component tests                               |
| `nx test frontend --coverage`                      | Frontend coverage under `coverage/apps/frontend`                   |
| `nx e2e frontend`                                  | Playwright e2e (mocked GraphQL, no backend)                        |
| `nx run backend:drizzle-generate -- --name <name>` | Generate a migration (required snake_case `--name`; never omit it) |
| `nx run backend:erd`                               | Write Mermaid ER diagram to `apps/backend/docs/database-schema.md` |
| `nx run backend:dmx-sniffer`                       | DMX USB sniffer CLI (Linux-only)                                   |
| `nx run bruno:build`                               | Rebuild Bruno API collection                                       |
| `nx run backend:drizzle-migrate`                   | Run migrations                                                     |
| `nx run backend:drizzle-seed`                      | Seed database                                                      |
| `nx run backend:drizzle-studio`                    | Open Drizzle Studio                                                |
| `nx run frontend:graphql-codegen`                  | Generate GraphQL types                                             |
| `nx run frontend:i18n-extract`                     | Extract translations                                               |
| `nx run frontend:i18n-verify`                      | Verify translation files are in sync                               |

**Package manager:** `pnpm` (used for `pnpm install` and other pnpm tasks). **Node:** 24.19.0. **pnpm:** ^11.21.0.
**Nx:** invoked directly as `nx <target> <project>` (e.g. `nx typecheck backend`) — do **not** prefix with `pnpm`.
**Env (`.env.example`):** `NODE_ENV`, `BACKEND_PORT` (HTTP; GraphQL at `/graphql`), `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`. Frontend: `apps/frontend/.env.example` has `NEXT_PUBLIC_GRAPHQL_API_URL`. Tests override `POSTGRES_*` via Testcontainers in `apps/backend/vitest.setup.ts`.

## Done means

1. Typecheck and lint pass with zero errors `nx run-many --targets typecheck,lint`.
2. Relevant tests run and pass (show output) `nx run-many --targets test`.
3. When changing GraphQL resolvers or DTOs, run `nx test backend` (includes `graphql-schema.spec.ts`) and rebuild Bruno requests `nx run bruno:build`.
4. When database schema has changed (entities, relations) regenerate ER diagram `nx run backend:erd`.
5. **Harness health-check** (required when change set matches the triggers below — report `Harness: up to date` or `Harness: updated`).
6. Conventional commit message ready when asked to commit.

## Conventions

- Clean architecture, domain-driven design, feature-based modules (resolver/service/repository/DTO/entity colocated)
- Repository pattern with `@InjectDb()` custom decorator + `DRIZZLE_DB_PROVIDER` token
- `DrizzleDbModule.forRoot` (project dynamic module); NestJS `ConfigModule.forRoot` loads `loadConfig()` → typed `Config`
- Path aliases: backend `@/*` → `apps/backend/src/*`; frontend `@/*` → `apps/frontend/src/*`
- `pnpm` (not npm/yarn), `nx` (not lerna/turborepo), Fastify (not Express), Drizzle (not Prisma/TypeORM)
- No typecheck errors, no lint errors

## Harness health-check

Harness maintenance is part of **done**, not optional docs.

**Triggers** (run the health-check when the change set includes any of these):

- New or renamed apps, packages, or Nx targets
- New or changed path aliases, module patterns, or stack versions
- New commands, env vars, or architecture boundaries

**If stale:** update **`AGENTS.md` in the same change set**. If `CLAUDE.md` / `.github/copilot-instructions.md` exist, keep them thin — edit overlays only if their overlay text is wrong.

**If accurate:** no harness edit.

**Report in the final response:** `Harness: up to date` or `Harness: updated` (one line + what changed). Skipping the check when it was required is incomplete work.

**Rules:** never invent features into `AGENTS.md` — only document what exists in code. Prefer short diffs; do not turn this file into a second README.

## Architecture

### Backend (`apps/backend/src/`)

- NestJS + Apollo GraphQL on Fastify (`autoSchemaFile: true`)
- Domain module: `FixturesModule` only. `AppModule` IO imports: `DmxModule`, `MidiModule`, `IoBridgeModule`. `UsbModule` is imported by `DmxModule`. `SerialSendService` is provided by `DmxModule` (no `SerialModule`).
- Domain pattern: Resolver → Service → Repository; DTO mapping via `plainToInstance()` in domain resolvers (inject services, not DB directly). IO resolvers may emit events or call services without repositories.
- Tests: Vitest unit/integration (`src/**/*.spec.ts`); GraphQL e2e in `src/e2e-tests/`; Testcontainers PostgreSQL in `apps/backend/vitest.setup.ts` (project root, not `src/`)
- Repositories use `InjectDb()` for typed Drizzle connection
- ORM repositories extend `BaseRepository` (`apps/backend/src/db/base.repository.ts`) for shared `publicId` CRUD; pass `relationalFind` for nested `with` graphs, add domain-specific methods as needed
- Events: `AppEventEmitter` extends `TypedEventEmitter<AppEvents>` wrapping `EventEmitter2`; `AppEvents = DmxEvents & MidiEvents`; IO modules import `EventsModule`
- CLI command via `nest-commander`: `dmx-sniffer` (Linux-only)
- Global `DrizzleDbModule` exports DB; `@/` path alias → `apps/backend/src/`
- IO layer: `io/dmx/`, `io/midi/`, `io/usb/`, `io/serial/`, `io/io-bridge/`

### Domain module structure (e.g. `fixtures/`)

Only domain module today: `fixtures/`.

```text
fixtures/
├── fixtures.module.ts # NestJS module (providers only)
├── fixture.service.ts # Business logic
├── fixture.resolver.ts # GraphQL queries/mutations
├── fixture.exceptions.ts # Extends BaseDomainError
├── channel-presets.ts # Enums/constants
├── dto/ # GraphQL DTOs
│ └── *.dto.ts # @ObjectType() / @InputType() with class-validator
├── entities/ # Drizzle schemas (export default)
│ └── index.ts # Re-exports
└── repositories/ # Data access (extends BaseRepository, InjectDb())
```

### Frontend (`apps/frontend/`)

- Next.js 16 App Router, locale-based routing (`src/app/[locale]/`); locale proxy via `src/proxy.ts` + `next-i18n-router` (default locale: `de`, `prefixDefault: true`). There is no `middleware.ts`.
- Mantine v9 (primary styling); CSS modules used sparingly; Phosphor Icons (`weight="duotone"` common, `"fill"` for some actions)
- Apollo Client v4; GraphQL codegen from `src/**/*.graphql` against remote schema (`NEXT_PUBLIC_GRAPHQL_API_URL`); types written to `src/shared/types/graphql/`
- i18n: `next-i18n-router` + `react-intl`; German/English (`src/lang/en.json`, `de.json`)
- `'use client'` on client boundary components (pages, wrappers); props types predominantly `*Props`
- `@/` path alias → `apps/frontend/src/`
- Apollo Client setup: `lib/graphql/graphql-client.ts` + `lib/graphql/apollo-wrapper.tsx`

### Database (`apps/backend/src/db/`)

- Schema: `schema.ts` → `relations.ts` (`defineRelations()`) → `columns.helpers.ts` (`pk`, `timestamps`)
- Entities: `d.snakeCase.table('name', { ...pk, ...timestamps, fields })`
- Repositories: one per entity/group, use `InferSelectModel`/`InferInsertModel`
- Migrations: `src/db/migrations/` (timestamp + snake_case name from `--name`; never drizzle-kit random names); seeding: `src/db/seeding/seed.ts`
- ER diagram: `nx run backend:erd` → `apps/backend/docs/database-schema.md`
- Query logging: `DrizzleLogWriter` wrapping NestJS `Logger` (exists but currently disabled in `DrizzleDbModule`)

## Coding Conventions

### TypeScript (strict, `tsconfig.base.json`)

- `noUncheckedIndexedAccess`, `noUnusedParameters` (prefix `_`), `noImplicitOverride`
- `exactOptionalPropertyTypes: false`, target ES2025, module esnext, resolution bundler

### ESLint

- `no-console`: warn · `eqeqeq`: error · `no-warning-comments`: warn
- `@typescript-eslint/switch-exhaustiveness-check`: error
- `@typescript-eslint/explicit-member-accessibility`: error (explicit modifiers required)
- `@typescript-eslint/member-ordering`: error · `@typescript-eslint/no-shadow`: error

### Prettier

- printWidth 120, single quotes, trailing comma all, arrow parens avoid

### NestJS / GraphQL

- Explicit `public`/`private`/`protected` on all members
- `plainToInstance()` to convert entities → DTOs in resolvers
- `@Type()` for nested DTO transformation; `class-validator` on InputTypes
- Descriptions on all GraphQL fields/resolvers; UUIDs via `GraphQLUUID`
- `autoSchemaFile: true`, Fastify adapter

### Drizzle ORM

- `d.snakeCase.table()`, helpers `pk` + `timestamps` from `@/db/columns.helpers`
- Relations in `relations.ts`; repository pattern for all DB access

### React

- `'use client'` on client boundary components; functional only; `AppShell` layout (header + navbar)

## Important Notes

- Frontend: Vitest colocated `*.spec.ts` / `*.spec.tsx`; Playwright e2e in `apps/frontend/e2e/*.e2e.spec.ts` (mocked GraphQL). Install Chromium once with `pnpm exec playwright install chromium`. Backend uses Vitest with GraphQL e2e in `src/e2e-tests/`
- `nx dev frontend` runs `next dev --webpack` (not Turbopack). Next 16 Turbopack exceeds Linux `fs.inotify.max_user_watches` on this pnpm tree and then reports missing modules (and PostCSS `picocolors` eval errors).
- `REVIEW` comments mark incomplete implementations (device selection, hardcoded serial paths)
- IO layer is Linux-focused (`/dev/usbmon`, serial ports)
- Production hides stack traces from GraphQL errors
- `BaseDomainError` → `GlobalGqlExceptionFilter` maps to GraphQL errors with `code` + `http.status` extension

## Internationalization (i18n)

- Translations live in `apps/frontend/src/lang/{en,de}.json`; keys are referenced via `t({ id, defaultMessage })` from `react-intl` (see `useTranslation()`).
- **When you change, add, or remove any i18n string, you MUST keep all language files in sync** — add/update/remove the key in every locale file (`en.json`, `de.json`, …). Use the `defaultMessage` as the English (`en.json`) value.
- Keep keys sorted alphabetically within each language file.
- After editing translations, run `nx run frontend:i18n-extract` to refresh extracted keys, then `nx run frontend:i18n-verify` to confirm no missing or extra keys remain.
