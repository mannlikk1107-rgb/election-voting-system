# Deployment

## Architecture

Browser -> Render Web Service -> Neon PostgreSQL

Render hosts the Node.js/Express application. Neon provides persistent PostgreSQL independently of Render's expiring free database. The app and Prisma schema remain compatible with other PostgreSQL providers.

## Neon Configuration

1. Create a Neon project/database. In Neon **Connect**, use the pooled connection URL for the application and the direct connection URL for Prisma migrations.
2. In the Render Web Service environment settings, set `DATABASE_URL` to Neon's pooled URL and `DIRECT_URL` to Neon's direct URL. Keep both secret values in Render's protected environment settings, never in `render.yaml`, source, documentation, or Git.
3. Set `NODE_ENV=production`. `render.yaml` generates `SESSION_SECRET`; verify it is at least 64 random characters. Add `SEED_ADMIN_PASSWORD` only for a deliberate one-off seed of a dedicated demo database.

## Render Web Service

Connect the GitHub repository to Render as a Blueprint and apply `render.yaml`. The service uses:

- Build: `npm ci && npm run prisma:generate && npm run prisma:deploy`
- Start: `npm start`
- Health check: `/health`

The build applies committed migrations and never runs the seed. The server uses Render's `PORT`, binds to `0.0.0.0`, and enables `trust proxy` in production. Confirm `/health` before opening database-backed pages. Back up Neon before schema changes and review the backup/restore options available for the selected plan.

> **上線前必須在有備份的 DB 上執行 `npm run prisma:deploy` 驗證** — migrations can drop or alter tables, so an unverified run against a database without a fresh backup can destroy election data.

## Session store table

Production sessions are persisted in PostgreSQL through `connect-pg-simple`. The application deliberately does not create this table at startup (to avoid running DDL at runtime), so provision it once per database before the first production boot:

```sh
npm run db:session-store
```

Run it with `DIRECT_URL` (preferred) or `DATABASE_URL` pointing at the target database; the script is idempotent (`CREATE TABLE IF NOT EXISTS`). The production `DATABASE_URL` must also enable TLS via `sslmode` (`verify-full` preferred); the application refuses to start otherwise.

## Verifying migrations on a disposable database (拋棄式 DB 實測步驟)

Never rehearse migrations against production. Use a throwaway PostgreSQL instance and point every connection variable at it (do not reuse production values):

```sh
DATABASE_URL=postgresql://postgres:pw@localhost:5433/election
DIRECT_URL=postgresql://postgres:pw@localhost:5433/election
SHADOW_DATABASE_URL=postgresql://postgres:pw@localhost:5433/shadow
```

Checklist:

- [ ] **Preview the target schema as SQL, offline.** This command talks to no database:
  ```sh
  npm run migrate:dry-run
  ```
- [ ] **Start a throwaway server.**
  ```sh
  docker run --rm -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=election -p 5433:5432 -d postgres:16
  ```
- [ ] **Apply the migrations in order.** `migrate deploy` replays every committed migration, oldest first (`20260930000000_init`):
  ```sh
  npm run prisma:deploy
  ```
  To replay a migration on its own, run the file directly:
  ```sh
  psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -1 -f prisma/migrations/20260930000000_init/migration.sql
  ```
- [ ] **Verify the schema applied.** Confirm the expected tables exist and that the run was recorded:
  ```sql
  SELECT to_regclass('"Vote"');                                  -- "Vote"
  SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;
  ```
  When a migration transforms existing data, seed representative rows before it runs and assert the resulting counts afterwards.
- [ ] **Verify rollback.** `psql -1` wraps the file in a single transaction, matching how Prisma applies it. Append an intentional failure to a copy and confirm nothing commits:
  ```sh
  cp prisma/migrations/20260930000000_init/migration.sql "$TMPDIR/init_test.sql"
  echo 'SELECT 1/0;' >> "$TMPDIR/init_test.sql"
  psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -1 -f "$TMPDIR/init_test.sql" || echo 'failed as expected'
  ```
  Then re-check that the tables created by that migration are absent.
- [ ] **Tear down.**
  ```sh
  docker rm -f $(docker ps -q --filter ancestor=postgres:16)
  ```

## Local Development

Follow [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) to configure a private `.env` for local PostgreSQL or Neon. Apply migrations only to the intended development database; seed only a disposable demo database. Start with `npm run dev` and open http://localhost:8888.