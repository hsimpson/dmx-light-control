# Backend

This is the backend application for the DMX Light Control project. It is built using NestJS and provides a GraphQL API for controlling DMX fixtures, as well as a command-line interface for sniffing DMX data from USB devices.

## Database

The backend uses a PostgreSQL database to store information about fixtures, vendors, and other related data. The database schema is managed using Drizzle ORM, and migrations are used to keep the schema up-to-date with the application code. See the [Drizzle ORM](#drizzle-orm) section below for more details on how to manage the database schema and migrations.

### Drizzle ORM

The backend uses Drizzle ORM for database interactions. The database schema is defined in `src/db/schema.ts`, and migrations are generated in the `src/db/migrations` directory. To generate a new migration after modifying the schema, run the following command:

```bash
nx run backend:drizzle-generate -- --name <migration_name>
```

To apply migrations, use the following command:

```bash
nx run backend:drizzle-migrate
```

To seed the database with initial data, use the following command:

```bash
nx run backend:drizzle-seed
```

To open Drizzle Studio:

```bash
nx run backend:drizzle-studio
```

### Entity Relationship Diagram

The database schema can be visualized as a Mermaid ER diagram. It is generated from the Drizzle schema and written to [`docs/database-schema.md`](docs/database-schema.md):

```bash
nx run backend:erd
```

The output file is auto-generated — do not edit it manually. Re-run the command after changing the schema to keep it in sync.

## Backend commands

To run the backend application, use the following command:

```bash
nx serve backend
```

`nx serve backend` also starts the local DB via `infra:db-start` (Docker required).

Typecheck and lint:

```bash
nx typecheck backend
nx lint backend
```

## Testing

Tests use Vitest with a Testcontainers PostgreSQL instance (see `vitest.setup.ts`).

```bash
nx test backend
```

- Unit/integration tests: `src/**/*.spec.ts`
- GraphQL e2e tests: `src/e2e-tests/`
- Test helpers: `src/testhelpers/`

## DMX Sniffer Command

The `dmx-sniffer` command allows you to monitor DMX data from a specified USB device. To use this command, you need to provide the bus number and address of the USB device you want to monitor. This command is only supported on Linux, because it relies on `usbmon` kernel module to capture USB traffic.

### Usage

Load the `usbmon` kernel module if it's not already loaded:

```bash
sudo modprobe usbmon
```

Find the bus number and address of your USB device using the `lsusb` command:

```bash
lsusb
```

Then, run the `dmx-sniffer` command with the appropriate options:

```bash
nx run backend:dmx-sniffer -- --bus <bus_number> --address <device_address>
```
