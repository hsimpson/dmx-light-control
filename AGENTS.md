# DMX Lighting Control System

NestJS backend + Next.js frontend in Nx monorepo.

**Last harness review:** 2026-10-23

## Agent behavior

- **Think before coding:** State assumptions. If unclear or multi-interpretation, ask. Surface tradeoffs. Push back on overcomplication.
- **Simplicity first:** Minimum code that solves the ask. No speculative features, abstractions, or config. No impossible-scenario error handling. Prefer a small rewrite over a bloated patch.
- **Surgical changes:** Touch only what the task requires. No drive-by refactors. Do not reformat files you did not change. Match existing style. Mention unrelated dead code; don’t delete it. Remove only orphans your changes created.
- **Goal-driven execution:** Define verifiable success (tests/commands). For multi-step work, brief plan + verify steps; loop until verified.
- **Bias:** Caution over speed except truly trivial tasks.
- **Prettier:** Before finishing, run Prettier on **every file you created or changed** (`pnpm exec prettier --write <paths>`; config `prettier.config.ts`). List paths with `git diff --name-only` (and `git diff --cached --name-only` if staged).
- **Stop servers you start:** If you start `nx serve backend` or `nx dev frontend` / `nx start frontend` (or equivalent `next`/`node` processes on their ports), stop them when the task is done. Do not leave them running. Leave Postgres (`infra:db-start`) alone unless you started it outside `nx serve backend` and the user asked you to stop it.
- **Drizzle migrations:** Never generate with drizzle-kit’s random folder names (e.g. `rapid_beast`). Always ask the user for a new snake_case name first, then run `nx run backend:drizzle-generate -- --name <name>`.

## Commands

| Command                                            | Description                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `nx serve backend`                                 | Backend dev server (also runs `infra:db-start`)                                                |
| `nx run infra:db-start`                            | Start local Postgres (Docker)                                                                  |
| `nx run infra:db-stop`                             | Stop local Postgres                                                                            |
| `nx run infra:db-reset`                            | Reset local Postgres (removes volumes)                                                         |
| `nx run infra:db-logs`                             | Tail local Postgres logs                                                                       |
| `nx dev frontend` / `nx start frontend`            | Frontend Next.js Turbopack-dev (port 3001) / prod start                                        |
| `nx build backend` / `nx build frontend`           | Production build                                                                               |
| `nx typecheck frontend`                            | Type check (backend has no target: `pnpm exec tsc -p apps/backend/tsconfig.app.json --noEmit`) |
| `nx lint backend` / `nx lint frontend`             | Lint                                                                                           |
| `nx test backend`                                  | Backend unit/integration + e2e tests                                                           |
| `nx test backend --coverage`                       | Backend coverage under `coverage/apps/backend`                                                 |
| `nx test frontend`                                 | Frontend Vitest unit/component tests                                                           |
| `nx test frontend --coverage`                      | Frontend coverage under `coverage/apps/frontend`                                               |
| `nx e2e frontend`                                  | Playwright e2e (mocked GraphQL, no backend)                                                    |
| `nx run backend:drizzle-generate -- --name <name>` | Generate a migration (required snake_case `--name`; never omit it)                             |
| `nx run backend:erd`                               | Write Mermaid ER diagram to `apps/backend/docs/database-schema.md`                             |
| `nx run backend:dmx-sniffer`                       | DMX USB sniffer CLI (Linux-only)                                                               |
| `nx run bruno:build`                               | Rebuild Bruno API collection (needs backend on `BACKEND_PORT`)                                 |
| `nx test bruno`                                    | Bruno collection generator unit tests                                                          |
| `nx run backend:drizzle-migrate`                   | Run migrations                                                                                 |
| `nx run backend:drizzle-studio`                    | Open Drizzle Studio                                                                            |
| `nx run frontend:graphql-codegen`                  | Generate GraphQL types (needs a reachable schema URL)                                          |
| `nx run frontend:i18n-extract`                     | Extract keys into `src/lang/en.json` only                                                      |
| `nx run frontend:i18n-verify`                      | Verify translation files are in sync                                                           |

**Package manager:** `pnpm` (used for `pnpm install` and other pnpm tasks). **Node:** 24.22.1. **pnpm:** 12.16.1 (exact pin in `packageManager` / `devEngines`; bump both when upgrading).
**Nx:** invoked directly as `nx <target> <project>` (e.g. `nx typecheck frontend`) — do **not** prefix with `pnpm`.
**Env (`.env.example`):** `NODE_ENV` (not in typed `Config`; GraphQL stack-trace stripping and Rspack asset-copy mode), `BACKEND_PORT` (required; HTTP; GraphQL at `/graphql`; live DMX WebSocket at `/dmx`), `LOG_LEVEL` (optional, default `log`; minimum Nest log level: `verbose`, `debug`, `log`, `warn`, `error`, `fatal`; applies to server and CLI), `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`. No env var selects I/O devices: DMX outputs and MIDI controllers are configured per project (see IO layer). Optional `FIXTURE_ASSETS_ROOT` overrides the fixture-asset disk root (used in tests; not in `.env.example`). Frontend: `apps/frontend/.env.example` has `NEXT_PUBLIC_GRAPHQL_API_URL` (the DMX socket URL is derived: HTTP GraphQL origin → `ws`/`wss` + `/dmx`). Nest `ConfigModule` loads workspace-root `.env`. Drizzle-kit targets run with cwd `apps/backend` and `dotenv/config` (so `apps/backend/.env` or already-exported vars). Infra compose uses `--env-file ../.env`. Tests override `POSTGRES_*` via Testcontainers in `apps/backend/vitest.setup.ts` (keep its image tag in sync with `infra/docker-compose.yml`).

## Done means

1. Typecheck and lint pass with zero errors `nx run-many --targets typecheck,lint` plus the backend `tsc` command above (`run-many` skips backend, which has no `typecheck` target).
2. Prettier has been run on all created/changed files (see Agent behavior).
3. Relevant tests run with coverage and pass, including the coverage thresholds in `vitest.base.ts` (show output) `nx run-many --targets test --coverage`.
4. When changing GraphQL resolvers or DTOs, run `nx test backend` (includes `graphql-schema.spec.ts`) and rebuild Bruno requests `nx run bruno:build`.
5. When database schema has changed (entities, relations) regenerate ER diagram `nx run backend:erd`.
6. **Harness health-check** (required when change set matches the triggers below — report `Harness: up to date` or `Harness: updated`).
7. Conventional commit message ready when asked to commit.
8. Servers you started are stopped (see Agent behavior).

## Conventions

- Clean architecture, domain-driven design, feature-based modules (resolver/service/repository/DTO/entity colocated)
- Repository pattern with `@InjectDb()` custom decorator + `DRIZZLE_DB_PROVIDER` token; global `DrizzleDbModule.forRoot` exports the DB
- NestJS `ConfigModule.forRoot` loads `loadConfig()` → typed `Config`
- Path aliases: backend `@/*` → `apps/backend/src/*`; frontend `@/*` → `apps/frontend/src/*`
- `pnpm` (not npm/yarn), `nx` (not lerna/turborepo), Fastify (not Express), Drizzle (not Prisma/TypeORM)

## Harness health-check

Harness maintenance is part of **done**, not optional docs.

**Triggers** (run the health-check when the change set includes any of these):

- New or renamed apps, packages, or Nx targets
- New or changed path aliases, module patterns, or stack versions
- New commands, env vars, or architecture boundaries

**If stale:** update **`AGENTS.md` in the same change set**. Keep `CLAUDE.md` thin — edit it only if its overlay text is wrong.

**If accurate:** no harness edit.

**Report in the final response:** `Harness: up to date` or `Harness: updated` (one line + what changed). Skipping the check when it was required is incomplete work.

**Rules:** never invent features into `AGENTS.md` — only document what exists in code. Prefer short diffs; do not turn this file into a second README.

## Architecture

### Backend (`apps/backend/src/`)

- NestJS + Apollo GraphQL on Fastify (`autoSchemaFile: true`)
- Domain modules: `FixturesModule`, `MidiMappingsModule` (global MIDI controller mapping catalog: `midi_mappings` + `midi_mapping_entries` with address, control type, optional LED feedback jsonb and LED type `Rgb`/`Single`; `midi_mappings.led_palettes` jsonb holds named behaviors/colors per LED type for the editors, stored feedback stays numeric; `exportMidiMappings` / `importMidiMappings` JSON round-trip via `MidiMappingImportExportService`, schema v1, upsert by publicId or name, entries replaced with their publicIds kept), `ProjectsModule` (`ProjectsModule` imports `FixturesModule` for `project_fixtures` patch instances). `AppModule` IO imports: `DmxModule`, `MidiModule`, `IoBridgeModule`, `IoDevicesModule`, `FunctionPlaybackModule`, `VirtualConsolePlaybackModule`. Live DMX output is `SerialSendService` (one shared 513-byte frame sent to every open FTDI UART via `DmxSerialPort`); it is provided and exported by `DmxModule` (no `SerialModule`). `MidiService` (exported by `MidiModule`) opens one input/output pair per device by port name.
- Domain pattern: Resolver → Service → Repository; DTO mapping via `plainToInstance()` in domain resolvers (inject services, not DB directly). Import/export is Resolver → `FixtureImportExportService` / `ProjectImportExportService` (`InjectDb()` + repositories + transactions). IO resolvers may emit events or call services without repositories.
- Tests: Vitest unit/integration (`src/**/*.spec.ts`); e2e in `src/e2e-tests/` (GraphQL, REST fixture assets, DMX/MIDI IO); Testcontainers PostgreSQL in `apps/backend/vitest.setup.ts` (project root, not `src/`)
- ORM repositories extend `BaseRepository` (`apps/backend/src/db/base.repository.ts`) for shared `publicId` CRUD; pass `relationalFind` for nested `with` graphs, add domain-specific methods as needed
- Events: `AppEventEmitter` extends `TypedEventEmitter<AppEvents>` wrapping `EventEmitter2`; `AppEvents = DmxEvents & MidiEvents & FunctionEvents & ProjectEvents` (`events/types/app-events.ts`); IO modules import `EventsModule`. `AppModule` also provides `AppEventEmitter` and imports `EventEmitterModule.forRoot()`.
- CLI command via `nest-commander`: `dmx-sniffer` (Linux-only)
- Static files: Fastify serves `apps/backend/src/assets` at `/assets/` when that directory exists (`nx serve`), otherwise Rspack-copied `dist/.../assets`. 3D models live under `apps/backend/src/assets/3d/` (e.g. `room.gltf`, `light_stand.glb`). Fixture catalog assets live under `apps/backend/src/assets/fixtures/$VENDOR/$FIXTURE_NAME` with generic defaults in `_defaults/` (`model.glb`, `picture.webp`, `picture-2d.svg`).
- Fixture asset uploads: REST multipart `POST/DELETE /fixtures/:publicId/assets/:kind` (`picture` \| `picture2d` \| `model3d`); GraphQL stores relative `/assets/...` paths and dimensions (`weight` kg, `width`/`length`/`height` in meters).
- Blender sources (`blender/`) are the authoring files; runtime GLB/GLTF under `apps/backend/src/assets/` is what the app serves. After editing a `.blend`, re-export the matching runtime file (do not leave the GLB stale). Source → runtime mapping: `blender/README.md`. Fixture models must face **+X**: the beam / throw axis and the front (lenses) point along world +X in Blender (identity in the app; do not compensate with loader rotations). Each fixture GLB includes a `BeamOrigin` empty at the LED-cluster center on the lens face. The room placement pivot stays the group origin; the loader offsets only the beam to that empty and opens the near cap to the lens-cluster radius. Export with the Blender MCP (`uvx blender-mcp`, configured in Claude Code user scope, not in the repo): open the source `.blend` if needed (`bpy.ops.wm.open_mainfile`), then `bpy.ops.export_scene.gltf(filepath=<runtime glb>, export_format='GLB', use_visible=True, export_cameras=False, export_lights=False, export_apply=True)`.
- IO layer: `io/dmx/` (GraphQL `setChannelValues` plus Fastify WebSocket `/dmx` for the live 512-channel universe; client messages `set`, `functionStart`, `functionStop`, `controlValue` (virtual console input; flash buttons a client holds are released when it disconnects); server broadcasts `functionState`, `controlState` (all console control values, also on connect) and raw `midiInput` for MIDI learn in the mapping editor), `io/function-playback/` (sequence playback layers merged HTP into the universe), `io/virtual-console-playback/` (plays the active project's saved console: `virtualConsole.input` → button/slider values, `dmx.manualValues` with HTP held levels, function start/stop; `virtualConsole.midiInput` (entry id + 0-127) → bound controls; reloads on `project.virtualConsoleUpdated`; emits `virtualConsole.state` and per-entry LED `virtualConsole.feedback` off/on/monitor), `io/midi/`, `io/serial/`, `io/io-bridge/` (MIDI bytes of each connected project device → its assigned mapping's entry → `virtualConsole.midiInput`; `virtualConsole.feedback` → LED Note-On `0x90|behavior, note, color` per Note entry, only on change, all again on `midi.outputOpened`; mappings cached until `midiMapping.changed`), `io/devices/` (USB device discovery + per-project connection)
- Project I/O devices: `projects.io_devices` (jsonb) stores identity only (`kind`, `name`, `manufacturer`, `serial`, `vendorId`, `productId`, `usbLocation` as tie-breaker for identical devices), never OS paths/port indexes. GraphQL `activateProject(publicId)` marks the loaded project (in memory in `ProjectService`); it emits `project.ioDevicesActivated` (also on device update, delete, import). `IoDeviceManagerService` matches configured vs. discovered devices (`match-io-devices.ts`, two-pass), opens/closes serial and MIDI handles, re-polls every 2 s while devices are configured, and serves `ioDevices` (status `Connected`/`Missing`/`Ambiguous`). `availableIoDevices` lists plugged-in devices. Identity lookup: serial via `SerialPort.list()` (+ Linux sysfs location); MIDI via Linux sysfs (ALSA client → card), macOS `ioreg`, Windows `Get-PnpDevice` (`io/devices/midi-identity/`, `execFile` with fixed args). The frontend project layout calls `activateProject` on mount and on DMX WebSocket reconnect; the `io` project tab edits the list.

### Domain modules (`fixtures/`, `midi-mappings/`, `projects/`)

- Flat per-domain files (`*.module.ts`, `*.resolver.ts`, `*.service.ts`, `*.exceptions.ts` extending `BaseDomainError`, import/export service + mapper + validator) plus `dto/` (`@ObjectType()`/`@InputType()` with class-validator), `entities/` (Drizzle tables, default export, `index.ts` barrel), `repositories/` (extend `BaseRepository`, `InjectDb()`).

### Frontend (`apps/frontend/`)

- Next.js 16 App Router, locale-based routing (`src/app/[locale]/`); locale proxy via `src/proxy.ts` + `next-i18n-router` (default locale: `de`, `prefixDefault: true`). There is no `middleware.ts`.
- Mantine v9 (primary styling); CSS modules used sparingly; Phosphor Icons (`weight="duotone"` common, `"fill"` for some actions)
- Apollo Client v4; GraphQL codegen from `src/**/*.graphql` against remote schema (`NEXT_PUBLIC_GRAPHQL_API_URL`); types written to `src/shared/types/graphql/`
- i18n: `next-i18n-router` + `react-intl`; German/English (`src/lang/en.json`, `de.json`)
- `'use client'` on client boundary components (pages, wrappers); functional components only; `AppShell` layout (header + navbar); prop types named `*Props` or `*Properties`
- Apollo Client setup: `src/lib/graphql/graphql-client.ts` + `src/lib/graphql/apollo-wrapper.tsx`

### Database (`apps/backend/src/db/`)

- Schema barrel: `schema.ts` re-exports domain tables (`@/fixtures/entities`, `@/midi-mappings/entities`, `@/projects/entities`). Relations: `relations.ts` (`defineRelations()`). Helpers: `columns.helpers.ts` (`pk`, `timestamps`).
- Entities live in domain `entities/` files: `d.snakeCase.table('name', { ...pk, ...timestamps, fields })`
- Repositories: one per entity/group, use `InferSelectModel`/`InferInsertModel`
- Migrations: `src/db/migrations/` (timestamp + snake_case name from `--name`; never drizzle-kit random names)
- ER diagram: `nx run backend:erd` → `apps/backend/docs/database-schema.md`
- Query logging: `DrizzleLogWriter` wrapping NestJS `Logger` (exists but currently disabled in `apps/backend/src/db/drizzle-db/drizzle-db.module.ts`)

## Coding Conventions

Rules live in `tsconfig.base.json`, `eslint.config.ts`, `prettier.config.ts`. Traps: `noUncheckedIndexedAccess` (indexed reads are `T | undefined`), `noUnusedParameters` (prefix `_`), `exactOptionalPropertyTypes: false`; ESLint requires explicit member accessibility, member ordering, exhaustive switches, no shadowing.

### NestJS / GraphQL

- `@Type()` for nested DTO transformation; `class-validator` on InputTypes
- Descriptions on all GraphQL fields/resolvers; UUIDs via `GraphQLUUID`

### Drizzle ORM

- `project_fixtures` links a project to catalog fixture + channel mode + DMX start address; `project_functions` stores project-scoped functions (type `Sequence`, jsonb `properties`); `projects.io_devices` (jsonb) stores the project's I/O devices, MIDI devices optionally with `midiMappingPublicId` (no FK: `MidiMappingInUseException` blocks deleting an assigned mapping; import drops unknown ids) (export schema v12)

## Important Notes

- Frontend: Vitest colocated `*.spec.ts` / `*.spec.tsx`; Playwright e2e in `apps/frontend/e2e/*.e2e.spec.ts` (mocked GraphQL). Install Chromium once with `pnpm exec playwright install chromium`.
- `REVIEW` comments mark incomplete implementations (ValidationPipe `disableErrorMessages` in `main.ts`)
- IO layer is Linux-focused (`/dev/usbmon`, serial ports)
- Production hides stack traces from GraphQL errors
- `BaseDomainError` → `GlobalGqlExceptionFilter` maps to GraphQL errors with `code` + `http.status` extension

## Internationalization (i18n)

- Translations live in `apps/frontend/src/lang/{en,de}.json`; keys are referenced via `t({ id, defaultMessage })` from `react-intl` (see `useTranslation()`).
- **When you change, add, or remove any i18n string, you MUST keep all language files in sync** — add/update/remove the key in every locale file (`en.json`, `de.json`, …). Use the `defaultMessage` as the English (`en.json`) value.
- Keep keys sorted alphabetically within each language file.
- After editing translations, run `nx run frontend:i18n-extract` (writes `en.json` only), sync the same keys in `de.json`, then `nx run frontend:i18n-verify` to confirm no missing or extra keys remain.

## Lessons

Format: `- **Topic:** imperative rule. Why: cause. (YYYY-MM)`. Max 10; promote durable ones into their section.

- **Frontend e2e:** run `NODE_ENV=production nx e2e frontend` with port 3001 free, or `pnpm exec playwright test` in `apps/frontend` against a running `nx dev frontend`. Why: Nx loads root `.env`; a non-production `NODE_ENV` breaks `next build` (`/_global-error` prerender `useContext` null), and the target's `start` dependency fails with EADDRINUSE when 3001 is taken. (2026-10)
