# Morrow

A storefront prototype for a home-goods brand with a local development backend, product catalog, checkout flow, and user authentication.

## Local development

Run the app locally with:

```bash
node dev.js
```

This starts:
- the frontend on port 3000
- the backend API on port 3001

## Deploying with Supabase

This project can be migrated to a hosted Supabase Postgres setup while keeping the current API contract intact.

1. Create a Supabase project in your own account.
2. Add the following environment variables to your deployment environment or local .env file:

```env
HOST=0.0.0.0
PORT=3000
API_PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Import the schema from [database/schema.sql](database/schema.sql) or the Supabase migration under [supabase/migrations](supabase/migrations).
4. Keep the service role key on the server only. Never expose it to the browser.
5. Use the Supabase project URL and anon key for client-side auth flows when needed, but keep the backend API behind your server host and allowed origins.

Production deployment should use the managed Postgres connection string from Supabase rather than the local SQLite file.

## Production-ready configuration

The project was updated to support deployment-oriented configuration without hardcoded localhost assumptions. The backend now reads environment variables for host, API port, allowed origins, and database path, and the frontend API client can be overridden with a custom live URL.

Key configuration values:
- `HOST`
- `API_PORT`
- `ALLOWED_ORIGINS`
- `DATABASE_PATH`
- `NODE_ENV`
- `MORROW_API_URL` or `MORROW_API_BASE_URL`

See [.env.example](.env.example) for the template.

## Authentication flow

The backend auth flow is implemented in [backend-server.js](backend-server.js):

- `POST /api/auth/register` creates a user and stores a password hash using `crypto.scryptSync`
- `POST /api/auth/login` validates the submitted password and creates a session token
- `GET /api/auth/me` validates the session cookie and returns the current user
- `POST /api/auth/logout` revokes the active session

Session cookies are stored as `morrow_session` and are validated against a SHA-256 hash in the SQLite `sessions` table. Login attempts are tracked in the `login_activity` table.

## Deployment notes

This app is still using SQLite by default for local development, which is fine for testing but not a long-term public deployment model. For a live website, the next step is to replace the local database with a hosted database service and point the app at a public API host using environment variables.

The current project changes make that migration easier by removing hardcoded localhost assumptions and documenting the configuration surface.

## Relevant files

- [backend-server.js](backend-server.js)
- [api-client.js](api-client.js)
- [server.js](server.js)
- [database/schema.sql](database/schema.sql)
- [.env.example](.env.example)
