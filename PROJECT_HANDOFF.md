# Morrow Objects – Project Handoff

## 1) Current project status
This project is a storefront prototype for a home-goods brand called Morrow Objects. It contains a branded marketing homepage, product catalog, cart flow, account flow, admin workspace, and a SQLite-backed API layer.

### Core structure
- `index.html` – landing page and public storefront shell
- `shop.html` / `product.html` – product browsing and product detail
- `app.js` – storefront behaviors: cart, checkout, search, account modal, order flow
- `router.js` – shared cart and account state coordination
- `products.js` – product catalog loader from the API
- `backend-server.js` – SQLite-backed API server for products, auth, and orders
- `server.js` – static file server for the frontend pages
- `database/schema.sql` – database schema for users, products, orders, sessions, and seller submissions
- `admin.html` / `admin.js` / `seller.html` / `seller.js` – admin and seller tools

### What is already working
- Static storefront pages render and navigate 
- Product catalog can be served through the API
- Auth endpoints exist for login/register/logout
- Orders can be created and retrieved via API
- SQLite schema supports a real product and order model
- Cart and checkout UI exist in the browser

### Remaining gaps
- The frontend and API are not started together in one clean command
- The project is split between localStorage-based UI state and API-backed logic
- Admin/seller flows are not fully unified with the same auth and product model
- The app still needs a single, end-to-end verified customer flow before it can be considered a complete production-ready storefront

## 2) Current runtime architecture
- Frontend: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`
- Product data is seeded into SQLite and served from `backend-server.js`
- The frontend uses `api-client.js` to call the backend API with credentials enabled
- `app.js` contains the bulk of the user-facing cart and checkout logic

## 3) Immediate next milestone
The next objective should be to turn the project into a single verified MVP of a live storefront:

1. Browse products
2. Open a product detail
3. Add to bag
4. Check out
5. Submit order to API
6. Confirm order in account history
7. View products in admin workspace

This is the most valuable milestone because it proves the system works as one website instead of isolated screens.

## 4) Recommended execution order
### Phase 1: Full startup reliability
- Add one command that boots both frontend and backend together
- Verify `/` and `/api/health` respond successfully
- Ensure the project can be started by another AI without manual multi-terminal work

### Phase 2: Customer flow completion
- Fix any mismatches between local cart state and API order persistence
- Confirm checkout creates real database orders
- Confirm account history reflects placed orders

### Phase 3: Admin flow completion
- Connect admin product editing to the same data store
- Confirm product mutations show up on the storefront
- Protect admin routes with proper server-side auth checks

### Phase 4: Polish and deployment readiness
- Add validation/error states
- Add tests for key flows
- Prepare for deployment configuration and production hosting

## 5) How to continue from here
Use the following commands from the project root:

- Start full app: `npm start`
- Frontend only: `npm run frontend`
- Backend only: `npm run backend`
- Smoke test: `npm run smoke`

## 6) Known implementation notes
- `package.json` currently only starts the frontend; the backend must still be launched separately.
- The app relies on browser cookies for auth (`morrow_session`) and `credentials: 'include'` is already enabled in the API client.
- The project is a good prototype but still needs a single unified execution layer before broader feature work is reliable.

## 7) Handoff summary
If another AI continues from here, the best next step is to make the local startup reliable and verify the main storefront order flow end-to-end before adding more features or styling changes.
