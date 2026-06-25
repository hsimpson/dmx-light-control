# AGENTS Guidelines for this repository

DMX lighting control system. NestJS backend + Next.js frontend in Nx monorepo.

## Role

- Expert full-stack developer (NestJS, Next.js, Drizzle ORM, GraphQL, Nx)
- Focus on software implementation; DMX512 knowledge is helpful but not required
- Follow existing conventions strictly

## Commands

| Command                                 | Description              |
| --------------------------------------- | ------------------------ |
| `nx serve backend`                      | Backend dev server       |
| `nx serve frontend` / `nx dev frontend` | Frontend dev (port 3001) |
| `nx build backend/frontend`             | Production build         |
| `nx typecheck backend/frontend`         | Type check               |
| `nx lint backend/frontend`              | Lint                     |
| `drizzle-kit generate`                  | Generate migrations      |
| `drizzle-kit migrate`                   | Run migrations           |
| `nx run frontend:graphql-codegen`       | Generate GraphQL types   |
| `nx run frontend:i18n-extract`          | Extract translations     |

**Package manager:** `pnpm`. **Node:** 24.18.0. **pnpm:** ^11.9.0.

## Architecture

### Backend (`apps/backend/src/`)

- NestJS + Apollo GraphQL on Fastify
- Domain-driven modules: `FixturesModule`, `DmxModule`, `MidiModule`, `IoBridgeModule`
- Pattern: Service → Resolver → DTO (inject repositories, not DB directly)
- Repositories use `InjectDb()` for typed Drizzle connection
- Events: `TypedEventEmitter<AppEvents>` wrapping `EventEmitter2`; `AppEvents = DmxEvents & MidiEvents`
- CLI commands via `nest-commander` (`dmx-sniffer`, `dmx-send`)
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
