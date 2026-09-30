# Deployment

## Local PostgreSQL

Follow [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) to provision PostgreSQL, configure ignored local environment values, apply migrations, and seed only a disposable database. Start the app with `npm run dev` and open http://localhost:8888.

## Render

1. Push this project to a GitHub repository.
2. In Render, create a Blueprint from the repository and review `render.yaml`.
3. Render provisions the PostgreSQL database and Node web service. The blueprint supplies `DATABASE_URL`, `DIRECT_URL`, a generated session secret, and runs `npm ci`, Prisma generation, and `prisma migrate deploy` during build.
4. Wait for the `/health` check to pass, then open the deployed service URL.
5. To load demo data, run the seed command once against the deployment database using a strong `SEED_ADMIN_PASSWORD`; do not use the development default in production.

Render's assigned `PORT` is used automatically and the server binds to `0.0.0.0`. Keep both URLs aligned if your database later uses a separate direct connection string. Back up the PostgreSQL database before schema changes.