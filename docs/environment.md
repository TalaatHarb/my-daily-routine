# Environment & configuration

## Local ports

| Service | URL |
| --- | --- |
| Web (Vite dev) | http://localhost:5173 (preview: 4173, container: 8090) |
| API | http://localhost:8080 (OpenAPI in Development: `/openapi/v1.json`) |
| Keycloak | http://localhost:8081 (admin `admin`/`admin`, realm user `demo`/`demo`) |
| PostgreSQL | localhost:5432, db/user/password `my_daily_routine` |

## API configuration

Set via `appsettings*.json` or environment variables (`__` separates sections).

| Key | Default (local) | Description |
| --- | --- | --- |
| `ConnectionStrings__Default` | local Postgres | Npgsql connection string |
| `Jwt__Authority` | `http://localhost:8081/realms/my-daily-routine` | Token issuer (must match `iss`) |
| `Jwt__Audience` | `my-daily-routine-web` | Required audience |
| `Jwt__MetadataAddress` | _(derived from authority)_ | Optional internal OIDC discovery URL |
| `Jwt__RequireHttpsMetadata` | `false` | Set `true` when metadata is served over HTTPS |
| `Cors__AllowedOrigins` | `http://localhost:5173,http://localhost:4173,http://localhost:8090` | Comma-separated SPA origins |
| `Database__MigrateOnStartup` | `true` | Apply EF Core migrations at startup |

Production (k8s) values: `Jwt__Authority=https://mydailyroutine-auth.talaatharb.net/realms/my-daily-routine` and
`Cors__AllowedOrigins=https://mydailyroutine.talaatharb.net`.

## Web configuration

Build-time variables (`apps/web/.env`) can be overridden at container start: `docker-entrypoint.sh` writes
`/env-config.js` (`window._env_`) from the same variable names.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | API origin |
| `VITE_OIDC_AUTHORITY` | `http://localhost:8081/realms/my-daily-routine` | Keycloak realm URL |
| `VITE_OIDC_CLIENT_ID` | `my-daily-routine-web` | Public OIDC client |
| `VITE_OIDC_REDIRECT_URI` | current origin | Login/logout redirect |

## Keycloak

- Local: `infrastructure/keycloak/realm-export.json` is imported on start. It includes the public PKCE client, the
  audience mapper, English/Arabic login themes, self-registration and the `demo` user.
- Kubernetes: the realm (without users, with production redirect URIs) is in `infrastructure/k8s/03-keycloak.yaml`.
- Keycloak stores its data in the `keycloak` schema of the application database (`KC_DB_SCHEMA=keycloak`).

## Database migrations

```powershell
dotnet tool restore
dotnet ef migrations add <Name> --project apps/api/src/MyDailyRoutine.Api --output-dir Data/Migrations
dotnet ef database update --project apps/api/src/MyDailyRoutine.Api
```
