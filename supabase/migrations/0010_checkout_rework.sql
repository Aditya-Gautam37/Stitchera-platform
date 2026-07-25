-- ============================================================================
-- STITCHERA — Checkout rework: handling/surge/delivery charges, tiered
-- advance payment, and the 3-free-bookings cap
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0009 first.)
--
-- Replaces the flat per-city visit_charge model with the blueprint's charge
-- structure. visit_charge stays as a column (harmless — Kanpur's is already
-- ₹0) but is no longer part of the customer-facing total; a future city
-- could still set it for a different purpose without this migration caring.
--
-- Payment stays a UI/structure change only, per the earlier decision: this
-- platform does not move real money yet. Nothing here auto-records a
-- "successful" payment — that would corrupt the payments ledger with a
-- transaction that never happened. record_payment() (0005) remains the only
-- way a payment is ever marked collected, and that's always a staff action.
-- ============================================================================

create type payment_preference as enum ('online', 'cod');

alter table orders
  add column handling_charge numeric(10,2) not null default 0,
  add column surge_charge numeric(10,2) not null default 0,
  add column advance_required numeric(10,2) not null default 0,
  add column payment_preference payment_preference;

alter table orders
  add constraint orders_new_charges_nonneg
  check (handling_charge >= 0 and surge_charge >= 0 and advance_required >= 0);

-- Room to record a real UPI handle later, per party — nullable, never
-- fabricated. The checkout page shows "not yet configured" rather than a
-- placeholder ID that looks payable but isn't.
alter table tailors add column upi_id text;
alter table profiles add column upi_id text;

-- ============================================================================
-- Subscriptions — minimal schema for the 3-free-bookings cap
--
-- Deliberately no purchase flow here (that's a separate phase — pricing,
-- checkout, and renewal are real product decisions this table doesn't try
-- to guess). This is just enough for create_order() to check "does this
-- customer have one," so the cap has something real to test against
-- instead of being unenforceable until the purchase flow exists.
-- ============================================================================

create table customer_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  plan        text not null check (plan in ('karigar', 'ustad', 'meher', 'shahi')),
  status      text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  granted_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

create index idx_customer_subscriptions_profile on customer_subscriptions(profile_id, status);

alter table customer_subscriptions enable row level security;

create policy "customer sees own subscriptions" on customer_subscriptions for select
  using (profile_id = auth.uid());

-- Admin-only, matching the same reasoning as promoting a profile to staff:
-- granting a subscription is a privilege/access decision, not a routine
-- city-ops task.
create policy "admin manages subscriptions" on customer_subscriptions for all
  using (is_admin())
  with check (is_admin());

create or replace function has_active_subscription(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from customer_subscriptions
    where profile_id = p_profile_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

revoke execute on function has_active_subscription(uuid) from public;
grant execute on function has_active_subscription(uuid) to authenticated;

-- ============================================================================
-- create_order(), rewritten
--
-- New in this version:
--   - handling_charge (flat ₹18) and surge_charge (₹10, only for a booking
--     placed late at night IST) replace visit_charge in the total.
--   - delivery_charge still comes from the city's flat rate — real
--     distance-based pricing (₹/km) needs a geocoding service this project
--     doesn't have credentials for yet. Labeled as an estimate in the UI;
--     not silently presented as a precise distance calculation.
--   - advance_required is computed (15% under ₹500 of items_total, 30% at
--     or above) and stored for staff reference — it does not collect
--     anything by itself, record_payment() still does that.
--   - the 3-free-booking cap: blocked once a customer has 3+ non-cancelled
--     orders and no active subscription. Cancelled orders don't count
--     against the cap — a booking someone backed out of shouldn't cost them
--     a free slot.
-- ============================================================================

drop function if exists create_order(uuid, uuid, int, text, text, text, text, text, uuid);

create or replace function create_order(
  p_service_id uuid,
  p_city_id uuid,
  p_qty int,
  p_address_line text,
  p_address_landmark text,
  p_address_pincode text,
  p_contact_phone text,
  p_customer_note text,
  p_measurement_id uuid default null,
  p_payment_preference payment_preference default 'cod'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_price numeric(10,2);
  v_delivery_charge numeric(10,2);
  v_items_total numeric(10,2);
  v_handling_charge numeric(10,2) := 18;
  v_surge_charge numeric(10,2) := 0;
  v_advance_required numeric(10,2);
  v_grand_total numeric(10,2);
  v_order_id uuid;
  v_recent_count int;
  v_active_order_count int;
  v_local_hour int;
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

  -- The 3-free-bookings cap. Cancelled orders don't count — cancelling
  -- shouldn't cost a free slot.
  select count(*) into v_active_order_count
    from orders
    where customer_id = v_customer_id and status <> 'cancelled';
  if v_active_order_count >= 3 and not has_active_subscription(v_customer_id) then
    -- Custom SQLSTATE (not the generic P0001 every other validation error in
    -- this function uses) so the app can tell "hit the free-booking cap"
    -- apart from "typo'd your pincode" and route to /subscriptions instead
    -- of just showing the message in a generic error box.
    raise exception 'You''ve used your 3 free bookings — choose a subscription plan to keep booking'
      using errcode = 'ST001';
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

  -- SECURITY DEFINER means RLS is bypassed in here — this ownership check is
  -- the only thing stopping a customer from attaching someone else's saved
  -- measurement to their order.
  if p_measurement_id is not null then
    if not exists (
      select 1 from measurements
      where id = p_measurement_id
        and profile_id = v_customer_id
        and is_active
    ) then
      raise exception 'That measurement profile is not available';
    end if;
  end if;

  select delivery_charge into v_delivery_charge
    from cities where id = p_city_id and is_active;
  if not found then
    raise exception 'That city is not currently serviceable';
  end if;

  if not exists (select 1 from services where id = p_service_id and is_active) then
    raise exception 'That service is not available';
  end if;

  v_price := service_price(p_service_id, p_city_id);
  v_items_total := v_price * p_qty;

  -- Late-hours surge: a booking placed between 8pm and 6am India time.
  v_local_hour := extract(hour from (now() at time zone 'Asia/Kolkata'));
  if v_local_hour >= 20 or v_local_hour < 6 then
    v_surge_charge := 10;
  end if;

  v_advance_required := round(
    v_items_total * (case when v_items_total >= 500 then 0.30 else 0.15 end),
    2
  );

  v_grand_total := v_items_total + v_handling_charge + v_surge_charge + v_delivery_charge;

  insert into orders (
    customer_id, city_id, address_line, address_landmark, address_pincode,
    contact_phone, items_total, visit_charge, delivery_charge, handling_charge,
    surge_charge, advance_required, payment_preference, grand_total, customer_note
  ) values (
    v_customer_id, p_city_id, trim(p_address_line), nullif(trim(coalesce(p_address_landmark, '')), ''),
    p_address_pincode, trim(p_contact_phone), v_items_total, 0, v_delivery_charge, v_handling_charge,
    v_surge_charge, v_advance_required, p_payment_preference, v_grand_total,
    nullif(trim(coalesce(p_customer_note, '')), '')
  )
  returning id into v_order_id;

  insert into order_items (order_id, service_id, measurement_id, qty, unit_price)
  values (v_order_id, p_service_id, p_measurement_id, p_qty, v_price);

  return v_order_id;
end;
$$;

revoke execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid, payment_preference) from public;
grant execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid, payment_preference) to authenticated;
