# Phase 5 verification checklist for Supabase migration

## 1. Health checks

### Backend health
```bash
curl -i https://your-api-domain.com/api/health
```

Expected:
- HTTP 200
- `ok: true`
- database engine reported as `PostgreSQL` or `Supabase`

### Product read
```bash
curl -i https://your-api-domain.com/api/products
```

Expected:
- HTTP 200
- one or more product objects
- each object includes name, category, price, description

## 2. Auth checks

### Register
```bash
curl -i -X POST https://your-api-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo User",
    "email": "demo@example.com",
    "password": "Password123!"
  }'
```

Expected:
- HTTP 201
- user object returned
- `Set-Cookie` header includes `morrow_session`

### Login
```bash
curl -i -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "Password123!"
  }'
```

Expected:
- HTTP 200
- user payload returned
- session cookie set

### Me
```bash
curl -i https://your-api-domain.com/api/auth/me \
  -H "Cookie: morrow_session=<token>"
```

Expected:
- HTTP 200 with the authenticated user

### Logout
```bash
curl -i -X POST https://your-api-domain.com/api/auth/logout \
  -H "Cookie: morrow_session=<token>"
```

Expected:
- HTTP 200
- cookie cleared with `Max-Age=0`

## 3. Order creation

```bash
curl -i -X POST https://your-api-domain.com/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: morrow_session=<token>" \
  -d '{
    "shipping": {
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "receipt": {
      "paymentMethod": "Card",
      "cardLast4": "4242"
    },
    "items": [
      { "name": "Arc bud vase", "quantity": 1 }
    ]
  }'
```

Expected:
- HTTP 201
- order payload with orderNumber and receipt information

## 4. Admin checks

```bash
curl -i https://your-api-domain.com/api/admin/orders \
  -H "Cookie: morrow_session=<token>"
```

Expected:
- HTTP 200 for admin role only
- HTTP 403 for non-admin users

## 5. RLS and unauthorized access checks

These checks are important after migration:

```sql
select * from public.products;
```

Expected in Supabase SQL editor:
- service role can read all rows
- anonymous users should be limited to published products via RLS

```sql
select * from public.users;
```

Expected:
- unauthenticated users cannot read rows
- the service role bypasses RLS in server-only paths

## 6. Data validation checks

Compare your old SQLite data and the new Supabase data:

- row counts by table
- null counts
- duplicate key counts
- referential integrity check
- sum of order totals
- product count and published count
- min/max dates on created_at values

Use the migration validation SQL in [supabase/validation/migration_validation.sql](supabase/validation/migration_validation.sql).

## 7. Manual checklist before launch

- [ ] database imported with migration file
- [ ] `DATABASE_URL` set in production
- [ ] `SUPABASE_URL` set in production
- [ ] `SUPABASE_ANON_KEY` set in production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` stored only on server
- [ ] `ALLOWED_ORIGINS` includes the real frontend origin
- [ ] frontend API URL configured to production API host
- [ ] auth redirect URLs configured in Supabase
- [ ] health endpoint returns OK on deploy
- [ ] sign-up, login, and order flows tested against live URL
- [ ] admin role still blocked for non-admin users
- [ ] old local SQLite backup preserved

## 8. Rollback plan

If production fails:

1. revert app build to previous stable commit
2. restore previous backend env file
3. point frontend back to old API URL
4. keep the old SQLite database as the rollback target
5. do not delete the migration history until the new database is validated

## 9. Success criteria

Deployment is complete when all of the following pass:

- /api/health = 200
- product listing works
- auth register/login/me/logout works
- order creation works for logged-in users
- admin-only route works for admin accounts only
- unauthorized reads are blocked by RLS
- totals and counts match the pre-migration database after validation
