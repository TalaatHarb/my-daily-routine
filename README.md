# My Daily Routine

A simple, responsive daily task manager. Add a task in one line, optionally give it a time, tick it off with a
satisfying animation, and use the `⋮` menu when you need more (move to tomorrow, categories, tags, duration,
impact, custom fields…). English (default) and Arabic (RTL) are supported, and the web app is an installable PWA.

| Part | Stack |
| --- | --- |
| `apps/web` | React 19 SPA (Vite), TanStack Query, react-router, i18next (en/ar + RTL), vite-plugin-pwa, OIDC (PKCE) |
| `apps/api` | ASP.NET Core 10 Web API, layered as Controllers → Services → Repositories, EF Core + Npgsql |
| Database | PostgreSQL 16, app tables in schema `app` |
| Identity | Keycloak 26 (OIDC + OAuth2), realm `my-daily-routine`, stored in the same database (schema `keycloak`) |

## Repository layout

```text
apps/
  api/            .NET solution (src/MyDailyRoutine.Api + tests/MyDailyRoutine.Api.Tests) and Dockerfile
  web/            React + Vite PWA, Dockerfile, nginx config and runtime env injection
docs/             architecture, environment and future-improvement notes
infrastructure/
  docker-compose.yml   local Postgres + Keycloak (and optionally the app containers)
  keycloak/            realm export imported on startup (local dev)
  postgres/init/       creates the keycloak schema on first start
  k8s/                 manifests for the my-daily-routine namespace (see infrastructure/k8s/README.md)
.github/workflows/     CI (build/test/lint) and release (ghcr images + GitHub release)
```

## Quick start (local development)

Prerequisites: Node.js 22+, .NET 10 SDK, Docker.

The root `.npmrc` pins the public npm registry for local, CI and Docker installs.

```powershell
npm install                 # installs the web workspace
npm run services:up         # Postgres on :5432, Keycloak on :8081 (realm imported, user demo/demo)
npm run dev                 # API on http://localhost:8080 and web on http://localhost:5173
```

Open http://localhost:5173 and sign in as `demo` / `demo`, or create an account (self-registration is enabled).
The API applies EF Core migrations on startup. Keycloak's admin console is at http://localhost:8081 (`admin`/`admin`).

To run everything in containers instead: `docker compose -f infrastructure/docker-compose.yml --profile app up --build`
(web on http://localhost:8090).

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run web:dev` / `web:build` / `web:lint` / `web:test` | Web dev server, production build, oxlint, vitest |
| `npm run api:dev` / `api:build` / `api:test` | Run, build or test the API |
| `npm run services:up` / `services:down` | Start/stop local Postgres + Keycloak |
| `npm run validate` | Everything CI runs for the web and API |

## How it works

1. The SPA signs the user in with Keycloak (authorization code + PKCE) and calls the API with the access token.
2. `GET /me` returns the user's profile, creating it from the token claims on first login (language, theme and
   time zone are then synced between the browser and the profile).
3. `GET /tasks` returns today's tasks by default. Other views use `?date=`, `?from=&to=`, `?overdue=true` or
   `?all=true` with `status`, `categoryId`, `tag` and `search` filters.
4. Categories and tags are free text, created on the fly and suggested from the user's previous entries. Each gets an
   automatic color from a 12-color palette (same hash in the API and the web app) which the user can change.

Every table carries a `user_id` foreign key and every query is scoped to the signed-in user.
See [docs/architecture.md](docs/architecture.md) for details.

## Deployment

Kubernetes manifests live in [`infrastructure/k8s`](infrastructure/k8s/README.md) and deploy into the
`my-daily-routine` namespace:

| Host | Service |
| --- | --- |
| https://mydailyroutine.talaatharb.net | web (nginx serving the PWA) |
| https://mydailyroutine-api.talaatharb.net | API (CORS allows only the web origin) |
| https://mydailyroutine-auth.talaatharb.net | Keycloak |

Tagging `vX.Y.Z` builds and pushes `ghcr.io/talaatharb/my-daily-routine/api` and `.../web` and publishes a
GitHub release.

## Documentation

- [Architecture](docs/architecture.md)
- [Environment & configuration](docs/environment.md)
- [Future improvements](docs/future-improvements.md)
- [API](apps/api/README.md) · [Web](apps/web/README.md) · [Kubernetes](infrastructure/k8s/README.md)
