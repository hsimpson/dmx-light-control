# DMX Lighting Control System

NestJS backend + Next.js frontend in Nx monorepo.

## Agent behavior

- **Think before coding:** State assumptions. If unclear or multi-interpretation, ask. Surface tradeoffs. Push back on overcomplication.
- **Simplicity first:** Minimum code that solves the ask. No speculative features, abstractions, or config. No impossible-scenario error handling. Prefer a small rewrite over a bloated patch.
- **Surgical changes:** Touch only what the task requires. No drive-by refactors or formatting. Match existing style. Mention unrelated dead code; don’t delete it. Remove only orphans your changes created.
- **Goal-driven execution:** Define verifiable success (tests/commands). For multi-step work, brief plan + verify steps; loop until verified.
- **Bias:** Caution over speed except truly trivial tasks.

## Commands

| Command                                 | Description                           |
| --------------------------------------- | ------------------------------------- |
| `nx serve backend`                      | Backend dev server                    |
| `nx dev frontend` / `nx start frontend` | Frontend dev (port 3001) / prod start |
| `nx build backend/frontend`             | Production build                      |
| `nx typecheck backend/frontend`         | Type check                            |
| `nx lint backend/frontend`              | Lint                                  |
| `nx run backend:drizzle-generate`       | Generate migrations                   |
| `nx run backend:drizzle-migrate`        | Run migrations                        |
| `nx run backend:drizzle-seed`           | Seed database                         |
| `nx run backend:drizzle-studio`         | Open Drizzle Studio                   |
| `nx run frontend:graphql-codegen`       | Generate GraphQL types                |
| `nx run frontend:i18n-extract`          | Extract translations                  |
| `nx run frontend:i18n-verify`           | Verify translation files are in sync  |

**Package manager:** `pnpm` (used for `pnpm install` and other pnpm tasks). **Node:** 24.18.0. **pnpm:** ^11.17.0.
**Nx:** invoked directly as `nx <target> <project>` (e.g. `nx typecheck backend`) — do **not** prefix with `pnpm`.

## Done means

1. Typecheck and lint pass with zero errors `nx run-many --targets typecheck,lint`.
2. Relevant tests run and pass (show output) `nx run-many --targets test`.
3. When changing graphql resolvers or DTOs, regenerate GraphQL schema `nx run-many --targets graphql-schema` and OpenCollection requests `nx run-many --targets generate-opencollection`.
4. When database schema has changed (entities, relations) regenerate erd diagrams `nx run-many --targets drizzle-erd`.
5. **Harness health-check** (required when change set matches the triggers below — report `Harness: up to date` or `Harness: updated`).
6. Conventional commit message ready when asked to commit.

## Conventions

- Clean architecture, domain-driven design, feature-based modules (resolver or controller/service/repository/DTO/entity colocated)
- Repository pattern with `@InjectDb()` custom decorator + `DRIZZLE_PG_PROVIDER` token
- Dynamic modules via `forRoot`/`forRootAsync`, config via plain object schemas + `InferConfigType`
- Path aliases: `@/config`, `@/orm-postgres`, `@/auth`, `@/core` (single index export each), `@/foods/*` (wildcard)
- `pnpm` (not npm/yarn), `nx` (not lerna/turborepo), Fastify (not Express), Drizzle (not Prisma/TypeORM)
- No typecheck errors, no lint errors

## Harness health-check

Harness maintenance is part of **done**, not optional docs.

**Triggers** (run the health-check when the change set includes any of these):

- New or renamed apps, packages, or Nx targets
- New or changed path aliases, module patterns, or stack versions
- New commands, env vars, or architecture boundaries

**If stale:** update **`AGENTS.md` in the same change set**. Keep `CLAUDE.md` / `.github/copilot-instructions.md` thin — edit overlays only if their overlay text is wrong.

**If accurate:** no harness edit.

**Report in the final response:** `Harness: up to date` or `Harness: updated` (one line + what changed). Skipping the check when it was required is incomplete work.

**Rules:** never invent features into `AGENTS.md` — only document what exists in code. Prefer short diffs; do not turn this file into a second README.

## Architecture

### Backend (`apps/backend/src/`)

- NestJS + Apollo GraphQL on Fastify
- Domain module `FixturesModule`; IO modules `DmxModule`, `MidiModule`, `IoBridgeModule` (under `io/`)
- Pattern: Service → Resolver → DTO (inject repositories, not DB directly)
- Repositories use `InjectDb()` for typed Drizzle connection
- Events: `TypedEventEmitter<AppEvents>` wrapping `EventEmitter2`; `AppEvents = DmxEvents & MidiEvents`
- CLI command via `nest-commander`: `dmx-sniffer` (Linux-only)
- Global `DrizzleDbModule` exports DB; `@/` path alias → `apps/backend/src/`
- IO layer: `io/dmx/`, `io/midi/`, `io/usb/`, `io/serial/`, `io/io-bridge/`

### Domain module structure (e.g. `fixtures/`)

```text
fixtures/
├── fixtures.module.ts # NestJS module (providers only)
├── fixture.service.ts # Business logic
├── fixture.resolver.ts # GraphQL queries/mutations
├── fixture.exceptions.ts # Extends BaseDomainError
├── channel-presets.ts # Enums/constants
├── dto/ # GraphQL DTOs
│ ├── *.dto.ts # @ObjectType() extends BaseDto
│ └── *.input.ts # @InputType() with class-validator
├── entities/ # Drizzle schemas (export default)
│ └── index.ts # Re-exports
└── repositories/ # Data access (InjectDb())
```

### Frontend (`apps/frontend/`)

- Next.js App Router, locale-based routing (`[locale]/`)
- Mantine v9 + CSS modules, Phosphor Icons (`weight="duotone"`)
- Apollo Client v4; GraphQL codegen from `.graphql` files
- i18n: `next-i18n-router`, German/English (`src/lang/en.json`, `de.json`)
- `'use client'` for all client components; props use `*Properties` type
- `@/` path alias → `apps/frontend/src/`
- Apollo Client setup: `lib/graphql/graphql-client.ts` + `apollo-wrapper.tsx`

### Database (`apps/backend/src/db/`)

- Schema: `schema.ts` → `relations.ts` (`defineRelations()`) → `columns.helpers.ts` (`pk`, `timestamps`)
- Entities: `d.snakeCase.table('name', { ...pk, ...timestamps, fields })`
- Repositories: one per entity/group, use `InferSelectModel`/`InferInsertModel`
- Migrations: `src/db/migrations/` (timestamped); seeding: `src/db/seeding/seed.ts`
- Query logging: `DrizzleLogWriter` wrapping NestJS `Logger`

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

- `'use client'`, functional only, `AppShell` layout (header + navbar)

## Important Notes

- No tests exist yet (no `*.spec.ts` files)
- `FIXME` comments mark incomplete implementations (device selection, hardcoded serial paths)
- IO layer is Linux-focused (`/dev/usbmon`, serial ports)
- Production hides stack traces from GraphQL errors
- `BaseDomainError` → `GlobalGqlExceptionFilter` maps to GraphQL errors with `code` + `http.status` extension

## Internationalization (i18n)

- Translations live in `apps/frontend/src/lang/{en,de}.json`; keys are referenced via `t({ id, defaultMessage })` from `react-intl` (see `useTranslation()`).
- **When you change, add, or remove any i18n string, you MUST keep all language files in sync** — add/update/remove the key in every locale file (`en.json`, `de.json`, …). Use the `defaultMessage` as the English (`en.json`) value.
- Keep keys sorted alphabetically within each language file.
- After editing translations, run `nx run frontend:i18n-extract` to refresh extracted keys, then `nx run frontend:i18n-verify` to confirm no missing or extra keys remain.
