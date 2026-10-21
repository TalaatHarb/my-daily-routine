# My Daily Routine API

ASP.NET Core 10, PostgreSQL, Keycloak JWT authentication. Controllers map HTTP;
services implement business rules; repositories own all EF queries and persistence.

## Run and test (PowerShell, repository root)

Install a .NET 10 SDK. The supplied machine had only a dotnet host, so an ignored,
project-local SDK was installed under `apps\api\.sdk`. To use it in the current shell:

```powershell
$env:DOTNET_ROOT = "$PWD\apps\api\.sdk"
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
dotnet build apps\api\MyDailyRoutine.slnx -warnaserror
dotnet test apps\api\MyDailyRoutine.slnx
dotnet run --project apps\api\src\MyDailyRoutine.Api --launch-profile http
```

The launch profile listens at http://localhost:8080. Running normally requires
PostgreSQL and Keycloak; tests use an isolated InMemory database and test-only auth,
so neither external service is required. OpenAPI: `/openapi/v1.json`, Development only.

## Database migrations

```powershell
dotnet tool restore
dotnet ef database update --project apps\api\src\MyDailyRoutine.Api
# After intentional model changes:
dotnet ef migrations add MigrationName --project apps\api\src\MyDailyRoutine.Api --output-dir Data\Migrations
```

`InitialCreate` is included. The design-time factory needs no live database to generate
migrations. All app tables and migration history live in schema `app`; schema
`keycloak` is untouched. Startup migrates by default. For production, migration
permissions can be given to a deployment job instead: run `database update` there
and set `Database__MigrateOnStartup=false` for the app.

## Configuration

`appsettings.json` provides defaults; standard .NET environment overrides use `__`
instead of `:`. Never use the development database password in production.

| Key | Default / purpose |
| --- | --- |
| `ConnectionStrings:Default` | `Host=localhost;Port=5432;Database=my_daily_routine;Username=my_daily_routine;Password=my_daily_routine` |
| `Jwt:Authority` | `http://localhost:8081/realms/my-daily-routine`; exact expected issuer |
| `Jwt:Audience` | `my-daily-routine-web` |
| `Jwt:MetadataAddress` | Optional OIDC discovery URL; otherwise derived from Authority |
| `Jwt:RequireHttpsMetadata` | `false`; enable for HTTPS discovery in production |
| `Cors:AllowedOrigins` | `http://localhost:5173`; comma-separated; production `https://mydailyroutine.talaatharb.net` |
| `Database:MigrateOnStartup` | `true` |

Kubernetes may set `Jwt__MetadataAddress` to
`http://keycloak.my-daily-routine.svc.cluster.local:8080/realms/my-daily-routine/.well-known/openid-configuration`.
`Jwt__Authority` must remain the public issuer, even when metadata/JWKS are fetched
internally. The public issuer is explicitly enforced. Use
`Jwt__RequireHttpsMetadata=false` with the internal HTTP discovery URL.

CORS is app-only, bearer tokens require no credentials, and preflights cache for
600 seconds. Forwarded IP/protocol headers are trusted from the ingress: restrict
network access to trusted reverse proxies; never expose this proxy-trusting listener
directly to untrusted clients. HTTPS termination belongs to the ingress.

## HTTP endpoints

All except health and Development OpenAPI require a bearer token with a `sub` claim.
Calling any authenticated business endpoint creates/refreshes the local user first.
Other users' resources always return 404. Validation returns RFC 7807 400 with
`errors`; duplicate label names return 409.

| Method | Path |
| --- | --- |
| GET | `/health` (liveness, no DB query) |
| GET | `/health/ready` (database connectivity) |
| GET | `/me` |
| PUT | `/me` |
| GET | `/tasks` |
| GET | `/tasks/{id}` |
| POST | `/tasks` |
| PUT | `/tasks/{id}` |
| PATCH | `/tasks/{id}/status` |
| POST | `/tasks/{id}/move` |
| POST | `/tasks/{id}/duplicate` |
| DELETE | `/tasks/{id}` |
| GET | `/categories` |
| POST | `/categories` |
| PUT | `/categories/{id}` |
| DELETE | `/categories/{id}` |
| GET | `/tags` |
| POST | `/tags` |
| PUT | `/tags/{id}` |
| DELETE | `/tags/{id}` |
| GET | `/openapi/v1.json` (Development only) |

`GET /tasks`: date precedence is `date` > inclusive `from`/`to` > `overdue=true` >
`all=true` > today in the user's IANA timezone (UTC fallback). Optional `status`,
`categoryId`, `tag`, `search` combine with the chosen date filter. Sort is date,
start time (null last), sort order, creation time. Label lists accept `search` and
`limit` (50 default, maximum 200); prefixes rank before other matches.

JSON uses camelCase, string enums (`todo`, `inProgress`, `done` and `minutes`,
`hours`, `days`, `weeks`), ISO dates, and `HH:mm` times (`HH:mm:ss` also accepted).
Create-task requires `name`; unspecified date defaults to today. Replace-task
requires `name` and `plannedDate`; omitted optional fields reset to defaults.
`PUT /me` preserves omitted fields and allows explicit null for locale/timezone.
Category/tag names are trimmed and matched case-insensitively. Colors default to
the deterministic UTF-8 FNV-1a palette; explicit `#rrggbb` values are lowercased.

## Container

From the repository root:

```powershell
docker build -f apps/api/Dockerfile -t my-daily-routine-api .
```

The multi-stage .NET 10 image runs as non-root `app` on port 8080.
`Dockerfile.dockerignore` limits context to API source and excludes build artifacts;
the Dockerfile copies no web, infrastructure, or root application files.

## File tree

```text
apps/api/
  .gitignore
  MyDailyRoutine.slnx
  Dockerfile
  Dockerfile.dockerignore
  README.md
  src/MyDailyRoutine.Api/
    MyDailyRoutine.Api.csproj
    Program.cs
    appsettings.json
    appsettings.Development.json
    Properties/launchSettings.json
    Auth/CurrentUser.cs
    Controllers/{Me,Tasks,Categories,Tags}Controller.cs
    Services/{UserService,TaskService,LabelServices}.cs
    Repositories/{UserRepository,TaskRepository,LabelRepositories}.cs
    Models/Entities.cs
    Dtos/Contracts.cs
    Data/AppDbContext.cs
    Data/AppDbContextFactory.cs
    Data/Migrations/*InitialCreate*.cs
    Data/Migrations/AppDbContextModelSnapshot.cs
    Infrastructure/{ColorPalette,Errors,TimeOnlyJsonConverter}.cs
  tests/MyDailyRoutine.Api.Tests/
    MyDailyRoutine.Api.Tests.csproj
    ServiceTests.cs
    ApiTests.cs
.config/dotnet-tools.json  # local dotnet-ef 10.0.13
```

## Verified on this machine

- `dotnet build apps\api\MyDailyRoutine.slnx -warnaserror`: success, zero warnings/errors.
- `dotnet test apps\api\MyDailyRoutine.slnx`: all 28 tests passed, no PostgreSQL required.
- EF migration SQL generated successfully; no pending model changes.
- Live HTTP smoke check with startup migration disabled: liveness 200, unauthenticated tasks 401, Development OpenAPI 200.
- Docker build attempted but the Docker daemon named pipe was unavailable.
- No live PostgreSQL/Keycloak integration or container execution was possible here.
