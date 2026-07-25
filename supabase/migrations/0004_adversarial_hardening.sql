-- ============================================================================
-- STITCHERA — Adversarial security review hardening
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- (Run 0001, 0002, and 0003 first.)
-- ============================================================================

-- ============================================================================
-- 1. CRITICAL — MASS ASSIGNMENT ON ORDER CREATION
--
-- "customer creates own orders" (0001) only checked `with check
-- (customer_id = auth.uid())`. It did NOT restrict any other column. Any
-- authenticated customer could bypass the app entirely and POST directly to
-- PostgREST:
--
--   POST /rest/v1/orders
--   { customer_id: "<self>", status: "delivered", payment_status: "paid",
--     grand_total: 0, items_total: 0, city_id: "<real city>", ... }
--
-- and RLS would accept it — a free order that already shows as paid and
-- delivered, with none of create_order()'s pricing/validation ever running.
-- Same story on order_items: "customer manages own placed order items"
-- (0003) let a customer insert an item with ANY unit_price into their own
-- placed order, disconnected from the real service price.
--
-- Fix: order creation no longer has a customer-writable path at all. The
-- ONLY way to create an order is create_order(), which is rebuilt below as
-- SECURITY DEFINER — it inserts on the customer's behalf after validating
-- everything itself, so no RLS insert policy is needed or wanted for
-- customers. Direct table access reverts to what it should have been:
-- read your own, write none.
-- ============================================================================

drop policy if exists "customer creates own orders" on orders;
drop policy if exists "customer manages own placed order items" on order_items;

create or replace function create_order(
  p_service_id uuid,
  p_city_id uuid,
  p_qty int,
  p_address_line text,
  p_address_landmark text,
  p_address_pincode text,
  p_contact_phone text,
  p_customer_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_price numeric(10,2);
  v_visit_charge numeric(10,2);
  v_delivery_charge numeric(10,2);
  v_items_total numeric(10,2);
  v_grand_total numeric(10,2);
  v_order_id uuid;
  v_recent_count int;
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Throttle: a real customer does not place more than a handful of
  -- bookings a minute. This blocks both scripted flooding and an
  -- accidental double-submit storm, without needing any external
  -- rate-limit infrastructure.
  select count(*) into v_recent_count
    from orders
    where customer_id = v_customer_id and placed_at > now() - interval '2 minutes';
  if v_recent_count >= 3 then
    raise exception 'Too many booking attempts — please wait a minute and try again';
  end if;

  if p_qty is null or p_qty < 1 or p_qty > 20 then
    raise exception 'Quantity must be between 1 and 20';
  end if;

  if p_address_pincode !~ '^[0-9]{6}$' then
    raise exception 'Pincode must be exactly 6 digits';
  end if;

  if p_address_line is null or length(trim(p_address_line)) < 5 then
    raise exception 'Please enter a fuller address';
  end if;

  if p_contact_phone is null or length(trim(p_contact_phone)) < 8 then
    raise exception 'Please enter a valid contact phone number';
  end if;

  select visit_charge, delivery_charge into v_visit_charge, v_delivery_charge
    from cities where id = p_city_id and is_active;
  if not found then
    raise exception 'That city is not currently serviceable';
  end if;

  if not exists (select 1 from services where id = p_service_id and is_active) then
    raise exception 'That service is not available';
  end if;

  v_price := service_price(p_service_id, p_city_id);
  v_items_total := v_price * p_qty;
  v_grand_total := v_items_total + v_visit_charge + v_delivery_charge;

  insert into orders (
    customer_id, city_id, address_line, address_landmark, address_pincode,
    contact_phone, items_total, visit_charge, delivery_charge, grand_total, customer_note
  ) values (
    v_customer_id, p_city_id, trim(p_address_line), nullif(trim(coalesce(p_address_landmark, '')), ''),
    p_address_pincode, trim(p_contact_phone), v_items_total, v_visit_charge, v_delivery_charge,
    v_grand_total, nullif(trim(coalesce(p_customer_note, '')), '')
  )
  returning id into v_order_id;

  insert into order_items (order_id, service_id, qty, unit_price)
  values (v_order_id, p_service_id, p_qty, v_price);

  return v_order_id;
end;
$$;

-- ============================================================================
-- 2. HIGH — CROSS-CITY RLS TOO BROAD ON SUBORDINATE TABLES
--
-- Orders themselves were correctly city-scoped for staff
-- (is_staff() and city_id = my_city()), but every table hanging off an
-- order used a flat is_staff() with no city check: order_items,
-- order_status_history, payments, and tailors. A city_manager in Kanpur
-- could read (and for tailors, WRITE) rows belonging to a different city
-- purely because they hold a staff role — the row-level boundary that
-- exists on `orders` didn't propagate to what references it.
-- ============================================================================

drop policy if exists "order items readable" on order_items;
drop policy if exists "staff manage order items" on order_items;

create policy "order items readable" on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or is_admin() or (is_staff() and o.city_id = my_city()))
  ));

create policy "staff manage order items" on order_items for all
  using (exists (
    select 1 from orders o
    where o.id = order_id and (is_admin() or (is_staff() and o.city_id = my_city()))
  ))
  with check (exists (
    select 1 from orders o
    where o.id = order_id and (is_admin() or (is_staff() and o.city_id = my_city()))
  ));

drop policy if exists "history follow order" on order_status_history;

create policy "history follow order" on order_status_history for select
  using (exists (
    select 1 from orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or is_admin() or (is_staff() and o.city_id = my_city()))
  ));

drop policy if exists "payments follow order" on payments;

create policy "payments follow order" on payments for select
  using (exists (
    select 1 from orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or is_admin() or (is_staff() and o.city_id = my_city()))
  ));

drop policy if exists "staff manage tailors" on tailors;

create policy "staff manage tailors" on tailors for all
  using (is_admin() or (is_staff() and city_id = my_city()))
  with check (is_admin() or (is_staff() and city_id = my_city()));

-- ============================================================================
-- 3. HIGH — profiles SELECT let any staff role read every profile, any city
--
-- "own profile read" was `id = auth.uid() or is_staff()` — a city_manager
-- in one city could read full_name/phone/email for every customer AND
-- every staff member in every OTHER city too, straight from PostgREST,
-- with no need to go through the app's (correctly city-scoped) UI at all.
--
-- customers don't carry a meaningful city_id of their own (it's set for
-- staff only — see the column comment in 0001), so "my city's customers"
-- has to be defined the same way the admin customers list already defines
-- it at the app layer: customers who have placed an order in my city. This
-- makes that the enforced rule at the database layer too, not just a
-- query the UI happens to write.
-- ============================================================================

drop policy if exists "own profile read" on profiles;

create policy "own profile read" on profiles for select
  using (
    id = auth.uid()
    or is_admin()
    or (is_staff() and city_id = my_city())
    or (is_staff() and exists (
      select 1 from orders o where o.customer_id = profiles.id and o.city_id = my_city()
    ))
  );

-- ============================================================================
-- 4. MEDIUM — SECURITY DEFINER / RPC-exposed functions were PUBLIC-executable
--
-- Postgres grants EXECUTE on a newly created function to PUBLIC by default
-- unless it's revoked — that includes Supabase's `anon` role. None of these
-- functions were exploitable by an anonymous caller (each one only acts on
-- auth.uid(), which is null for anon, and fails safely), but an unauthenticated
-- caller should not be able to invoke privileged/internal functions at all.
-- Least privilege, not a patch for an actual bypass.
-- ============================================================================

revoke execute on function is_admin() from public;
revoke execute on function is_staff() from public;
revoke execute on function my_role() from public;
revoke execute on function my_city() from public;
revoke execute on function service_price(uuid, uuid) from public;
revoke execute on function create_order(uuid, uuid, int, text, text, text, text, text) from public;
revoke execute on function order_stats() from public;

grant execute on function is_admin() to authenticated;
grant execute on function is_staff() to authenticated;
grant execute on function my_role() to authenticated;
grant execute on function my_city() to authenticated;
grant execute on function service_price(uuid, uuid) to authenticated;
grant execute on function create_order(uuid, uuid, int, text, text, text, text, text) to authenticated;
grant execute on function order_stats() to authenticated;

-- ============================================================================
-- 5. Supporting index for the new rate-limit check in create_order()
-- ============================================================================

create index idx_orders_customer_placed on orders(customer_id, placed_at desc);
