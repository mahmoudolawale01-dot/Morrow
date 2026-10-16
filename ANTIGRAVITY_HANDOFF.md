# Antigravity Handoff

Use this note to continue the Morrow Objects project from the current workspace state. Do not discard or overwrite the existing worktree changes.

## Current State

- Default runtime is the custom Node.js backend, not Next.js: run `node dev.js` to start `server.js` on port 3000 and `backend-server.js` on port 3001.
- Next.js and `app/api` exist as a separate runtime path, started with `npm run dev:next`.
- The last committed revision is `fbed55f` (`Add vendor signup and admin exports`). The current working tree has uncommitted changes in `README.md`, `admin.js`, `backend-server.js`, and `customer-flow-check.js`. Inspect `git status` before editing or committing.
- The local development app is currently running at `http://127.0.0.1:3000` and API at `http://127.0.0.1:3001`.

## Implemented Features

- Customer accounts use server-backed cookie sessions. Public registration can create customer or seller accounts, but not admins.
- Signup offers User or Vendor. Vendor registration requires name, email, phone, address, and password; `vendor` is normalized to the backend `seller` role.
- Seller accounts can submit goods and view their submissions with real-time review status. Admins can list submissions and approve or reject them with optional reviewer feedback (`POST /api/admin/submissions/:id/approve` and `.../reject`). Approved submissions are automatically assigned unique slugs and inserted into the live product catalog with immediate public visibility and direct storefront links.
- Admin user management and data exports are protected by server-side admin role checks. Exports generate real `.xlsx` files for customer users, vendors, or products with date, vendor, and product-type filters.
- Admin product management now uses the database catalog: list, create, edit, publish/unpublish, reorder, delete, and seed-catalog reset routes are protected by admin authorization. The storefront and product export read the same catalog.
- On the first authenticated admin load, legacy browser-local catalog data is migrated once to the database. CORS preflight allows `PATCH` and `DELETE` for browser mutations.

## Key Files

- `backend-server.js`: API routing, authentication/role checks, SQL persistence, seller submission review routes, admin product routes, and exports.
- `admin.js` / `admin.html`: admin dashboard, catalog CRUD client, seller submission approval/rejection actions, and Excel workbook download.
- `seller.js` / `seller.html`: vendor signup/login, seller submission form, review status display, and catalog link for approved items.
- `app.js` / `index.html`: storefront account-type selection and customer signup.
- `database/schema.sql`: default SQLite schema.
- `customer-flow-check.js`: integration coverage for customer, admin, vendor, export, catalog CRUD, and seller submission approval/rejection flows.
- `README.md`: project setup and continuation summary.

## Verification

The following commands passed after the seller submission review implementation:

```bash
npm run flow-check
npm run smoke
```

The flow check covers admin-only product and submission review access, seller submission approval and automatic catalog insertion, submission rejection with reviewer notes, prevention of duplicate approval or invalid actions, product create/update/public visibility/reorder/delete, product export consistency, CORS preflight, vendor requirements/submissions, and existing customer/admin flows.

## Suggested Next Work

1. Review the frontend-only admin page gate and deployment security before production; protected API routes must remain authoritative.
2. Run `npm audit --omit=dev` and review the advisories already present in the dependency tree. Avoid forced dependency upgrades without checking compatibility.
3. Consider adding email or webhook notifications to sellers when an item is approved or rejected.

## Suggested Antigravity Prompt

Read this handoff and `README.md`, inspect `git status`. Preserve all existing changes and data. Run `npm run flow-check` and `npm run smoke` after any changes. Do not commit or push unless explicitly asked.
