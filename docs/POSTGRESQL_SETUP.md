# PostgreSQL Setup

This application uses PostgreSQL for election records and production sessions. Do not substitute SQLite or test against a production database during development.

## Render PostgreSQL

1. In Render, create or select the PostgreSQL database attached by `render.yaml`.
2. Open the database's **Connect** panel and copy the **Internal Database URL** only into the web service's secret environment settings. Do not paste it into source, YAML, Git, issue comments, or chat.
3. Set `DATABASE_URL` to that URL. Set `DIRECT_URL` to the direct database URL as well; if you use a transaction-pooler URL for application queries, use the direct connection URL for `DIRECT_URL` so Prisma migrations do not run through the pooler.
4. Set `NODE_ENV=production`. Generate `SESSION_SECRET` using Render's **Generate** control or the Render secret store. The blueprint already generates the session secret and maps the PostgreSQL URL variables.
5. Deploy. The configured build command runs `npm ci`, `npm run prisma:generate`, and `npm run prisma:deploy`. It applies committed migrations and does not seed demo records.
6. Confirm `/health` is healthy before opening database-backed pages.

Do not put database URLs or seed passwords in `render.yaml`; it should contain only Render references and generated secrets. Before a schema migration, create and verify a database backup. Render backup and retention options depend on the database plan; check the database's **Backups** page and plan limits.

## Local Windows PostgreSQL

1. Install PostgreSQL for Windows using the official PostgreSQL installer, or use an existing trusted local PostgreSQL installation. Ensure the PostgreSQL service is running and `psql` is available in PowerShell.
2. Connect to the local server as its database administrator:

   ```powershell
   psql -U postgres -h localhost
   ```

3. At the `psql` prompt, create a dedicated application role and database. Set its password interactively so it is not written into shell history:

   ```sql
   CREATE ROLE election_app LOGIN;
   \password election_app
   CREATE DATABASE election_system OWNER election_app;
   \q
   ```

4. Copy `.env.example` to `.env` locally. Replace its placeholders with private values for `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, and `SEED_ADMIN_PASSWORD`. Set both database URLs in that ignored file using this shape for the URLs, replacing the angle-bracket placeholders privately:

   ```text
   postgresql://<role>:<percent-encoded-password>@localhost:5432/election_system?schema=public
   ```

   For a direct local PostgreSQL connection, both variables can use the same URL. Percent-encode reserved characters in the password. Never paste the resulting URL into a terminal command, logs, Git, or a support request.

5. Validate and apply only committed migrations, then seed the local demonstration database:

   ```powershell
   npm run prisma:validate
   npm run prisma:generate
   npm run prisma:deploy
   npm run prisma:seed
   ```

   `npm run prisma:migrate` is for creating a new development migration after a schema change; review and commit that migration before deploying it. Never run `prisma migrate reset` against a database containing data.

## Safe, Repeatable Seeding

`npm run prisma:seed` uses upserts and a stable demo-election ID. Re-running it updates the known demo accounts, election, eligibility rows, and nominations instead of adding duplicate rows. It sets the demo election to its sample voting state and rewrites those demo records; therefore, run it only against a disposable/local demo database, never against a real election database.

Set a private policy-compliant `SEED_ADMIN_PASSWORD` in the ignored local `.env` before seeding. Seeding refuses to run when the variable is missing. On Render, provide it only through a protected one-off environment/job, run the seed only against a dedicated demo database, then remove the temporary secret. Do not run the seed as part of every deploy.

The seed creates one administrator, three candidate accounts, two approved voters, one pending voter, one sample election, three approved nominations, and the corresponding voter eligibility records. All demo accounts use the configured seed password.

## Backups

Before migrations or maintenance, take a PostgreSQL custom-format backup to a protected location outside the repository. Create that secure folder first, then `pg_dump` prompts for the database password when required:

```powershell
New-Item -ItemType Directory -Force -Path C:\SecureBackups
pg_dump --format=custom --host localhost --port 5432 --username election_app --dbname election_system --file C:\SecureBackups\election_system.dump
```

Encrypt and access-control backups because they contain user and election data. Verify backups by restoring into a new, empty test database (not over the source):

```powershell
createdb -h localhost -U postgres election_system_restore
pg_restore --host localhost --username election_app --dbname election_system_restore --no-owner C:\SecureBackups\election_system.dump
```

Do not commit backup files. For Render, use the database dashboard's supported backup/export options and store exports outside the repository with equivalent protection.

## Troubleshooting

- **`Environment variable not found: DATABASE_URL`:** confirm the ignored local `.env` exists and contains a non-empty `DATABASE_URL`; restart the server after editing it. Do not print the URL to check it.
- **Connection refused:** confirm the PostgreSQL Windows service is running, the host/port are correct, and local port 5432 is reachable.
- **Authentication failed:** reset the dedicated local role password interactively and update the private `.env`; percent-encode reserved URL characters.
- **Prisma migration cannot connect:** run `npm run prisma:validate` first; confirm `DIRECT_URL` points to a direct PostgreSQL connection, then retry `npm run prisma:deploy`. Do not reset or drop the database to work around migration errors.
- **Render deploy fails on migration:** inspect the migration error without exposing connection strings; confirm the Render service is attached to the expected database and that its role can create schema objects. Back up before repairing or retrying a failed migration.
- **Missing schema after deploy:** verify the committed migration directory and Render build output; `prisma migrate deploy` applies committed migrations but does not create new migration files or insert seed data.