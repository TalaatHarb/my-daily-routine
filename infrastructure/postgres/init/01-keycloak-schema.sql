-- Keycloak shares the application database; its tables live in a dedicated schema.
-- The application itself uses the "app" schema (created by EF Core migrations).
CREATE SCHEMA IF NOT EXISTS keycloak;
