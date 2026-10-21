# Kubernetes Deployment Guide (my-daily-routine)

Manifests for deploying every component to the `my-daily-routine` namespace.

## Architecture & endpoints

| Component | URL / address | Notes |
|---|---|---|
| Web (React PWA) | `https://mydailyroutine.talaatharb.net` | Ingress → Nginx SPA container |
| API (.NET) | `https://mydailyroutine-api.talaatharb.net` | Ingress → ASP.NET Core API |
| Auth (Keycloak 26) | `https://mydailyroutine-auth.talaatharb.net` | Realm `my-daily-routine`, public client `my-daily-routine-web` (PKCE) |
| PostgreSQL 16 | `postgres.my-daily-routine.svc.cluster.local:5432` | StatefulSet with hostPath-backed PV |

Keycloak and the API share the `my_daily_routine` database: the API uses the `app` schema (EF Core migrations run on API start-up) and Keycloak uses the `keycloak` schema (created by the Postgres init script and, for pre-existing volumes, by the Keycloak `ensure-keycloak-schema` init container).

### Auth & CORS

- `Jwt__Authority` is the **public** realm URL so it matches the token `iss` claim. `Jwt__MetadataAddress` points at the **internal** Keycloak service so discovery/JWKS requests stay inside the cluster (Keycloak runs with `--hostname-backchannel-dynamic=true`).
- CORS is handled by the API (`Cors__AllowedOrigins=https://mydailyroutine.talaatharb.net`). The API ingress intentionally has **no** `enable-cors` annotations, otherwise responses would carry duplicate `Access-Control-Allow-Origin` headers.
- The Keycloak client only allows redirects and web origins for `https://mydailyroutine.talaatharb.net`. The realm in `03-keycloak.yaml` has self-registration enabled and no seeded users.

## Prerequisites

- Ingress controller with `ingressClassName: nginx`
- cert-manager with `ClusterIssuer: letsencrypt-prod`
- A `local-hostpath` storage class (or change `01-postgres-pv.yaml` for your storage)
- DNS records for the three hosts pointing at the ingress controller
- Images `ghcr.io/talaatharb/my-daily-routine/api` and `.../web` (published by the release workflow)

## Deployment steps

### 1. Namespace and secrets

Copy `secrets.example.yaml` to `infrastructure/k8s/secrets/secrets.yaml` (git-ignored) and replace every `CHANGE_ME` value. The Postgres password must match in `POSTGRES_PASSWORD`, `CONNECTION_STRING` and `KC_DB_PASSWORD`.

```bash
kubectl apply -f infrastructure/k8s/00-namespace.yaml
kubectl apply -f infrastructure/k8s/secrets/secrets.yaml
```

### 2. Storage & database

```bash
kubectl apply -f infrastructure/k8s/01-postgres-pv.yaml
kubectl apply -f infrastructure/k8s/02-postgres.yaml
```

### 3. Keycloak

```bash
kubectl apply -f infrastructure/k8s/03-keycloak.yaml
```

The realm is imported on first start only (`--import-realm` skips existing realms). Change realm settings afterwards in the admin console.

### 4. API and web

```bash
kubectl apply -f infrastructure/k8s/04-api.yaml
kubectl apply -f infrastructure/k8s/05-web.yaml
```

Or apply everything after the namespace and secrets exist:

```bash
kubectl apply -f infrastructure/k8s/
```

## Updating images

```bash
kubectl -n my-daily-routine set image deployment/api api=ghcr.io/talaatharb/my-daily-routine/api:vX.Y.Z
kubectl -n my-daily-routine set image deployment/web web=ghcr.io/talaatharb/my-daily-routine/web:vX.Y.Z
```
