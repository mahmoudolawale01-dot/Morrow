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

Equivalent npm commands are `npm run dev` or `npm start`. The app uses SQLite by default; set the database and deployment variables described in [.env.example](.env.example) when changing environments.

## Current implementation and AI handoff

The following flows are implemented in the current project state:

- Customer signup and login use the storefront account dialog and backend session cookie (`morrow_session`). Customers need to be signed in to place orders.
- Signup first offers **User** or **Vendor**. User creates a customer account. Vendor opens the seller signup flow and must provide a name, email, phone number, address, and password. The backend normalizes `vendor` to the `seller` role and requires the phone and address.
- Admin accounts are bootstrapped from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`; public registration cannot create an admin account. Admin API routes check the server-side session and role.
- Sellers can submit products and see their own submissions and review statuses (pending, approved, rejected, with reviewer notes). Admins can review the seller submission queue and approve or reject items via admin-protected endpoints (`POST /api/admin/submissions/:id/approve` and `.../reject`). Approved submissions automatically create items in the database catalog with clean slugs and are immediately available on the storefront.
- The admin workspace can create, edit, publish/unpublish, reorder, delete, and reset products through admin-only API routes. Admin product management, the storefront, and product exports now use the same database catalog. Each catalog item's edit actions display the vendor that uploaded the product along with the upload date and time. The Edit Product dialog also shows upload info and supports vendor editing. Existing browser-local catalog data is migrated once on the first authenticated admin load.
- The admin workspace can export Users (customer accounts), Vendors, or Products as real `.xlsx` workbooks. Exports support inclusive date ranges, vendor selection, product-type filtering, and applicable sorting. The export endpoint is `GET /api/admin/export-data`; it requires an admin session. ExcelJS is loaded from `node_modules` in the admin page.

### Useful files

- [backend-server.js](backend-server.js) – auth, role checks, database upgrades, seller submissions review lifecycle, and admin export endpoint
- [admin.html](admin.html) / [admin.js](admin.js) – admin workspace, catalog CRUD, submission approval/rejection, and export dialog/workbook generation
- [admin-export.css](admin-export.css) – export dialog layout
- [seller.html](seller.html) / [seller.js](seller.js) – vendor signup/login, submission form, and seller submission status tracking
- [index.html](index.html) / [app.js](app.js) – storefront account-type choice and customer signup
- [database/schema.sql](database/schema.sql) – SQLite schema
- [supabase/migrations/20261001000000_initial_schema.sql](supabase/migrations/20261001000000_initial_schema.sql) – Postgres/Supabase schema
- [customer-flow-check.js](customer-flow-check.js) – role, order, vendor, submission review, and export API regression checks

### Verify changes

From the project root:

```bash
npm run smoke
npm run flow-check
```

The smoke check verifies the frontend and API health routes. The flow check covers customer registration/orders, admin access and user management, vendor signup/contact validation/submissions, seller submission review actions (approve/reject/reasons/catalog sync), and export access/filtering. The admin workbook flow has also been browser-checked by generating and parsing each workbook with ExcelJS.

### Known gaps and next steps

1. Revisit the frontend-only admin page gate before production. Keep relying on backend role checks for protected data and mutations.
2. Run `npm audit --omit=dev` and review current advisories before deployment. A recent audit reported advisories in existing Next.js dependencies and in ExcelJS's transitive dependency tree; no forced dependency upgrades were applied.

### Suggested continuation sequence

1. Check `git status` and read this handoff before editing; preserve any existing worktree changes.
2. Start the app with `node dev.js` and run both verification commands above.

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
