# Workout Tracker

Self-hosted gym and calisthenics tracker. This repository is at Phase 0 (foundation): a Vue web shell, a NestJS API and a PostgreSQL connection with automated checks. Workout features, offline support and the PWA are not implemented yet.

- Product scope and decisions: [`docs/architecture.md`](docs/architecture.md)
- Phase plans: local, Git-ignored `.planning/prds/` directory

## Prerequisites

- Node.js 24 LTS (`24.22.2`, see `.nvmrc`)
- pnpm `12.18.0` (enable with `corepack enable pnpm`)
- Docker with Compose

## Setup

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev:db
pnpm db:migrate
```

`pnpm install` enforces the Node/pnpm engine ranges from `package.json`.

## Run

In separate terminals:

```sh
pnpm dev:api   # http://localhost:3000, /api/health and /docs
pnpm dev:web   # http://localhost:5173, proxies /api to the API
```

Open <http://localhost:5173>. The status screen should report that the API and database are ready. `pnpm dev:api` compiles and starts once; restart it after backend changes.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm check     # typecheck, tests and build
```

API integration tests use `TEST_DATABASE_URL`, defaulting to the local `workout_tracker_test` database. Overrides must target a dedicated test database whose name ends in `_test`. The Compose init script creates the default on first database initialization. If your volume predates the script, create it once:

```sh
docker compose exec db psql -U workout_tracker -d postgres -c 'CREATE DATABASE workout_tracker_test;'
```

Compose's `workout_tracker_dev` password is only a local development/rehearsal placeholder. Set a separately managed secret for any deployed database.

## Database

- Migrations live in `apps/api/drizzle/`. Run `pnpm db:migrate`.
- Generate migrations after a schema change with `pnpm db:generate` (requires `DATABASE_URL`).
- `docker compose down` keeps the `pgdata` volume. `docker compose down -v` permanently deletes local databases.
- API startup does not run migrations automatically.

## Production build rehearsal

Serves the built web app and API under one origin at <http://localhost:8080>:

```sh
docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml run --rm api node dist/database/migrate.js
docker compose -f compose.prod.yaml up -d
```

Stop with `docker compose -f compose.prod.yaml down` (add `-v` to delete its database). Swagger is disabled by default when `NODE_ENV=production`.

## Android testing with ngrok

The API and web app keep one origin through Vite's `/api` proxy:

```sh
pnpm dev:db
pnpm db:migrate
pnpm dev:api
DEV_ALLOWED_HOSTS=your-subdomain.ngrok-free.app pnpm dev:web
ngrok http 5173
```

Open the ngrok HTTPS URL on Android Chrome. Do not expose PostgreSQL through the tunnel. A changing tunnel hostname creates a separate browser origin, service-worker scope and local storage; prefer a stable reserved domain once local data exists.

## Configuration

Server settings are validated at startup. See `apps/api/.env.example`. Never commit `.env` files or production secrets.
