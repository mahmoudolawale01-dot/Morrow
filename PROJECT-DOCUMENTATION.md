# Morrow Objects Project Documentation

## 1. Project Overview

Morrow Objects is a custom e-commerce website for browsing and purchasing considered home goods. It currently includes:

- Public storefront and product browsing
- Product search, category filters, product details, and shopping bag
- Customer registration, login, logout, and session persistence
- Multi-step checkout and order confirmation
- Customer order history
- Admin workspace for products, users, activity, seller submissions, and orders
- SQLite-backed API and database schema

The project uses plain HTML, CSS, and JavaScript on the frontend and a Node.js HTTP server with SQLite on the backend.

## 2. How To Run The Project

From the project directory:

```powershell
npm start
```

This starts:

- Frontend: http://127.0.0.1:3000
- Backend API: http://127.0.0.1:3001

Useful individual commands:

```powershell
npm run frontend
npm run backend
npm run smoke
npm run flow-check
```

The `start` command uses `dev.js` to check the required ports before starting both services.

## 3. Frontend And Backend Integration

The frontend and backend are joined and working together. They are separate processes for development, but they are not separate disconnected applications.

The connection works as follows:

1. `server.js` serves the HTML, CSS, and browser JavaScript on port `3000`.
2. `api-client.js` sends requests to `http://127.0.0.1:3001`.
3. API requests use `credentials: 'include'`, so the browser sends the HTTP-only `morrow_session` cookie.
4. `backend-server.js` authenticates that cookie against the SQLite `sessions` table.
5. The backend handles registration, login, current-user lookup, logout, products, orders, and admin order queries.
6. `app.js` uses the API for account state, order creation, and order history, with local browser state used only as a fallback and UI cache.

The main integration files are:

- `api-client.js`: shared frontend API request wrapper
- `backend-server.js`: Node API server and session/order logic
- `app.js`: storefront account, cart, checkout, and order UI
- `auth-gate.js`: protected-page authentication checks
- `database/schema.sql`: SQLite tables and relationships

## 4. Authentication Flow

- Registration: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Current session: `GET /api/auth/me`
- Logout: `POST /api/auth/logout`

Passwords are hashed with Node's `crypto.scryptSync`. Session tokens are stored in the browser as HTTP-only cookies, while only the token hash is stored in SQLite.

The signed-in account dashboard now displays the authenticated session start date and time. The value comes from the backend session's `created_at` field as `signed_in_at`.

## 5. Commerce Flow

- Products are seeded into SQLite when the API starts.
- The browser maintains the active cart for the shopping experience.
- Checkout sends the selected item names and quantities to the API.
- The API validates each item against the published product catalog.
- Prices and totals are calculated from database prices, not browser-submitted prices.
- The API stores the order, line items, shipping data, receipt number, payment method, and card last four digits.
- Full card numbers, expiry dates, and CVC values are not stored or sent to the API.

The customer flow regression test also verifies that a forged browser price is replaced by the server catalog price.

## 6. Database

The SQLite database file is created at:

```text
database/morrow.sqlite
```

Main tables:

- `users`
- `sessions`
- `login_activity`
- `password_reset_tokens`
- `products`
- `orders`
- `order_items`
- `seller_submissions`

The schema is defined in `database/schema.sql`.

## 7. Current Validation

Validated locally:

- Frontend responds successfully on port `3000`.
- Backend health endpoint responds successfully on port `3001`.
- Registration and login create authenticated sessions.
- The frontend can call `/api/auth/me` and render the signed-in account.
- Orders can be created and retrieved through the API.
- Browser checkout reaches confirmation and clears the bag.
- Order history updates after purchase.
- Server-side catalog pricing prevents client price tampering.

## 8. Remaining Production Work

The project is a working commerce prototype and local application. Before accepting real customers, complete these items:

1. Integrate a real payment provider such as Stripe Checkout or Stripe Payment Intents.
2. Never process raw card fields through the custom application server once real payments are enabled.
3. Move SQLite to a managed production database if traffic or operational needs require it.
4. Configure production origins, HTTPS, secure cookies, CORS, and environment variables.
5. Deploy the frontend and backend to a production host.
6. Add transactional email for receipts, shipping updates, and password recovery.
7. Replace localStorage admin product management with authenticated server-side product management.
8. Add inventory quantities, stock validation, refunds, fulfillment statuses, and audit logging.
9. Add automated tests for authentication, permissions, orders, and payment webhooks.

## 9. Recommended Continuation Order

1. Real payment provider integration with test mode and webhook verification.
2. Production environment configuration and deployment.
3. Server-side admin product and inventory management.
4. Email notifications and password recovery.
5. Inventory, fulfillment, refund, and reporting workflows.

## 10. Important Development Notes

- Do not commit `database/morrow.sqlite` if production data or personal data is present.
- Do not place payment secrets in frontend JavaScript.
- The current local API URL is hard-coded in `api-client.js`; production deployment should use an environment-aware configuration.
- The current server is intended for local development and should be placed behind HTTPS and a production process manager before launch.
