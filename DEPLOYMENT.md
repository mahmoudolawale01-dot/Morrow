# Deployment and authentication guide

## Overview

This project was prepared for a real deployment path by removing hardcoded localhost assumptions from the API and frontend configuration. The app can now be configured through environment variables instead of relying on local-only ports and local disk paths.

## Current status

The project is still using SQLite as the default database for local development. That is fine for testing and local demos, but it is not the correct long-term model for a public website.

For a live website, move to a managed hosted database such as PostgreSQL or MySQL and point the backend to that database using `DATABASE_URL` or equivalent environment settings.

## Environment configuration

Use [.env.example](.env.example) as the starting point.

Recommended values for a live deployment:

- `NODE_ENV=production`
- `HOST=0.0.0.0` for the backend, if the host is exposing the service externally
- `API_PORT=3001`
- `ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`
- `DATABASE_URL=postgresql://user:password@host:5432/dbname`
- `MORROW_API_URL=https://api.your-domain.com`

The frontend file [api-client.js](api-client.js) supports a browser override via `window.MORROW_API_URL` or `window.MORROW_API_BASE_URL`.

## Backend auth flow

The live auth flow remains the same as the local version:

1. `POST /api/auth/register`
   - validates name, email, and password strength
   - checks for duplicate emails
   - hashes the password with `crypto.scryptSync`
   - creates the user record
   - creates a session cookie for the user

2. `POST /api/auth/login`
   - reads the submitted email and password
   - checks the user record
   - validates the password hash
   - creates a new session token if valid
   - sends a cookie named `morrow_session`

3. `GET /api/auth/me`
   - reads the session cookie
   - validates the hash
   - returns the authenticated user

4. `POST /api/auth/logout`
   - invalidates the active session token
   - clears the cookie

This logic is implemented in [backend-server.js](backend-server.js).

## Database migration path

To move from local SQLite to a production database:

1. Create the same tables in a hosted database service.
2. Convert SQLite-specific syntax to the target database syntax.
3. Set the backend to use a remote connection string or environment variables.
4. Seed product data through the application startup logic or a migration script.
5. Validate login, signup, product loading, and order creation against the live database.

The source schema is in [database/schema.sql](database/schema.sql).

## CORS and cookies

Live deployment requires production-safe CORS and cookie settings:

- allow only the real frontend origin in `ALLOWED_ORIGINS`
- use secure cookies in production (`SameSite=None; Secure` when needed)
- ensure the browser is allowed to send credentials for cross-origin requests

The cookie handling lives in [backend-server.js](backend-server.js) and now switches behavior between local development and production mode based on `NODE_ENV`.

## Deployment checklist

- [ ] Choose a hosting platform for the backend
- [ ] Choose a managed database service
- [ ] Set environment variables
- [ ] Configure custom domain and HTTPS
- [ ] Update API URL for the live frontend
- [ ] Test signup/login/logout on the deployed site
- [ ] Provide production database backups and monitoring

## Important note

A local database file cannot be treated as a public live database. It is only safe for local testing when the app and the database file live on the same machine. For a public website, use a remote database and a remote backend service.
