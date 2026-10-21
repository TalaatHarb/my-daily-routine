# Architecture

## Overview

```text
 Browser (PWA)  ──OIDC code+PKCE──▶  Keycloak  ──▶  PostgreSQL (schema keycloak)
      │                                  ▲
      │ Bearer access token              │ JWKS / metadata
      ▼                                  │
 ASP.NET Core API  ───────────────────────┘
      │ EF Core (Npgsql)
      ▼
 PostgreSQL (schema app)
```

Keycloak and the API share one PostgreSQL database but use separate schemas (`keycloak` and `app`), so they can
be backed up together while staying isolated.

## API (`apps/api`)

Layered architecture:

| Layer | Responsibility |
| --- | --- |
| `Controllers` | HTTP mapping only: routes, binding, status codes |
| `Services` | Business rules: "today" in the user's time zone, label resolution/auto-creation, status transitions, validation |
| `Repositories` | All EF Core queries and persistence; every query filters by `UserId` |
| `Models` / `Dtos` | EF entities and request/response contracts |
| `Auth` | Reads the current user's `sub` and profile claims from the JWT |
| `Infrastructure` | Problem-details error handling, color palette, JSON converters |

### Data model

All tables have `user_id` referencing `users`.

| Table | Notes |
| --- | --- |
| `users` | `subject` (Keycloak `sub`, unique), username, email, names, display name, locale, time zone, theme |
| `tasks` | name, description, `planned_date`, optional `start_time`, duration + unit, status (`todo`/`inProgress`/`done`), `completed_at`, impact (0–100), resources, optional category, sort order, `metadata` (jsonb key/value) |
| `categories` / `tags` | name, normalized name (unique per user), color |
| `task_tags` | task ↔ tag link |

The task model follows the activity model from the activity-dag project, without dependencies between tasks.

### Endpoints

| Method & path | Purpose |
| --- | --- |
| `GET /me` | Get the profile, creating it from token claims on first call |
| `PUT /me` | Update display name, locale, time zone, theme |
| `GET /tasks` | Today by default; `date`, `from`/`to`, `overdue`, `all` plus `status`, `categoryId`, `tag`, `search` |
| `POST /tasks` | Create; `plannedDate` defaults to today; `category`/`tags` are names (auto-created) |
| `GET/PUT/DELETE /tasks/{id}` | Read, replace, delete |
| `PATCH /tasks/{id}/status` | Quick complete / reopen / in-progress |
| `POST /tasks/{id}/move` | Move to another day |
| `POST /tasks/{id}/duplicate` | Copy a task |
| `GET/POST/PUT/DELETE /categories`, `/tags` | Manage labels; `GET ?search=&limit=` powers autocomplete |
| `GET /health`, `GET /health/ready` | Liveness and readiness (database check), anonymous |

Errors use RFC 7807 problem details. Another user's resources return `404`, and duplicate label names return `409`.

## Web (`apps/web`)

- **Routing:** `/` (today), `/day/:date`, `/upcoming`, `/overdue`, `/all`, `/categories`, `/tags`, `/settings`.
  A sidebar holds the views on wide screens; on narrow screens it becomes a drawer behind a hamburger button.
- **Data:** TanStack Query handles caching. Completing, moving, deleting and quick-adding update the UI
  optimistically and roll back on error.
- **Auth:** `react-oidc-context`/`oidc-client-ts`. Tokens are kept in `localStorage` so an installed PWA stays
  signed in; tokens are renewed silently.
- **i18n:** i18next with `en` and `ar`. Switching language sets `<html lang dir>`. Styles use CSS logical
  properties, and directional icons are mirrored in RTL.
- **UI primitives:**
  - The three-dot menu uses the native Popover API, with a polyfill loaded only when the browser needs it.
  - Dialogs use `<dialog>` with `showModal()`.
  - Category and tag inputs are ARIA comboboxes.
- **PWA:** `vite-plugin-pwa` generates the service worker and manifest. Runtime configuration (`env-config.js`)
  is fetched network-first so a deployed container can change the API/OIDC URLs without a rebuild.

## Security notes

- The API validates the issuer (public Keycloak URL) and audience (`my-daily-routine-web`, added to access tokens
  by an audience mapper). Metadata/JWKS can be fetched from an internal address (`Jwt__MetadataAddress`).
- CORS is enforced by the API only (`Cors__AllowedOrigins`), not by the ingress, to avoid duplicate headers.
- All data access is scoped by the authenticated user's id in the repositories.
