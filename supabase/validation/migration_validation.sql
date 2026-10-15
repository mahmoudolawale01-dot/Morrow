-- Validation queries for migration/import checks
-- Run these in Supabase SQL editor after the data is loaded.

-- 1. Row counts
select 'users' as table_name, count(*) as row_count from public.users
union all
select 'sessions', count(*) from public.sessions
union all
select 'password_reset_tokens', count(*) from public.password_reset_tokens
union all
select 'login_activity', count(*) from public.login_activity
union all
select 'products', count(*) from public.products
union all
select 'orders', count(*) from public.orders
union all
select 'order_items', count(*) from public.order_items
union all
select 'seller_submissions', count(*) from public.seller_submissions;

-- 2. Duplicate key checks
select 'duplicate_users_email' as check_name, count(*) as issue_count
from (
  select email
  from public.users
  group by email
  having count(*) > 1
) d
union all
select 'duplicate_orders_number', count(*)
from (
  select public_order_number
  from public.orders
  group by public_order_number
  having count(*) > 1
) d
union all
select 'duplicate_receipt_number', count(*)
from (
  select receipt_number
  from public.orders
  group by receipt_number
  having count(*) > 1
) d
union all
select 'duplicate_product_slug', count(*)
from (
  select slug
  from public.products
  group by slug
  having count(*) > 1
) d;

-- 3. Null and integrity checks
select
  'users_missing_email' as check_name,
  count(*) as issue_count
from public.users where email is null
union all
select 'orders_missing_user', count(*) from public.orders where user_id is null
union all
select 'order_items_missing_order', count(*) from public.order_items where order_id is null
union all
select 'products_missing_name', count(*) from public.products where name is null
union all
select 'orders_missing_shipping', count(*) from public.orders where shipping_json is null;

-- 4. Numeric and date quality
select
  min(price_cents) as min_product_price_cents,
  max(price_cents) as max_product_price_cents,
  sum(price_cents) as total_product_price_cents,
  min(created_at) as min_product_created_at,
  max(created_at) as max_product_created_at
from public.products;

select
  min(total_cents) as min_order_total_cents,
  max(total_cents) as max_order_total_cents,
  sum(total_cents) as total_order_value_cents,
  min(created_at) as min_order_created_at,
  max(created_at) as max_order_created_at
from public.orders;

-- 5. Referential integrity spot check
select count(*) as orphaned_order_items
from public.order_items oi
left join public.orders o on o.id = oi.order_id
where o.id is null;

select count(*) as orphaned_orders
from public.orders o
left join public.users u on u.id = o.user_id
where u.id is null;

-- 6. Sample spot-checks
select id, email, name, role, status
from public.users
order by created_at desc
limit 10;

select id, slug, name, price_cents, published, sort_order
from public.products
order by sort_order, id
limit 10;

select id, public_order_number, user_id, total_cents, status, created_at
from public.orders
order by created_at desc
limit 10;

-- 7. EXPLAIN ANALYZE examples for expected query patterns
explain analyze
select *
from public.products
where published = true
order by sort_order, id
limit 20;

explain analyze
select *
from public.orders
where user_id = 1
order by created_at desc
limit 20;

explain analyze
select *
from public.order_items
where order_id = 1;
