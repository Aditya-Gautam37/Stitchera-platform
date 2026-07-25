-- ============================================================================
-- STITCHERA — Measurements: the retention moat, wired up
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0005 first.)
--
-- The measurements table existed from 0001 but nothing in the app ever read
-- or wrote it, and order_items.measurement_id was never populated — so a
-- returning customer had to re-give their measurements every single time,
-- which is exactly the friction this table was designed to remove.
-- ============================================================================

-- ============================================================================
-- 1. SECURITY FIX — CITY-SCOPE THE MEASUREMENTS POLICY
--
-- "own measurements" (0001) is `profile_id = auth.uid() or is_staff()` with
-- no city check. 0004 fixed this same flat-is_staff() pattern on orders,
-- order_items, payments, tailors, and profiles but missed measurements.
-- Any staff member in any city could read — and write — any customer's body
-- measurements straight from PostgREST. This is among the more personal data
-- in the system, so it gets the same boundary as everything else: your own,
-- or a customer who has ordered in your city.
-- ============================================================================

drop policy if exists "own measurements" on measurements;

create policy "own measurements" on measurements for all
  using (
    profile_id = auth.uid()
    or is_admin()
    or (is_staff() and exists (
      select 1 from orders o
      where o.customer_id = measurements.profile_id and o.city_id = my_city()
    ))
  )
  with check (
    profile_id = auth.uid()
    or is_admin()
    or (is_staff() and exists (
      select 1 from orders o
      where o.customer_id = measurements.profile_id and o.city_id = my_city()
    ))
  );

-- ============================================================================
-- 2. INTEGRITY + LOOKUP INDEX
--
-- `values` is jsonb with no shape enforcement — at minimum it must be a JSON
-- object, not an array or a bare scalar, or the app's field lookups silently
-- return null instead of failing loudly.
-- ============================================================================

alter table measurements
  add constraint measurements_values_is_object
    check (jsonb_typeof(values) = 'object');

create index idx_measurements_profile_active on measurements(profile_id, is_active);

-- ============================================================================
-- 3. ATTACH A SAVED MEASUREMENT TO AN ORDER AT BOOKING TIME
--
-- create_order() gains an optional p_measurement_id. The ownership check
-- below is essential and NOT redundant: this function is SECURITY DEFINER
-- (made so in 0004 to close the mass-assignment hole), which means RLS does
-- NOT apply inside it. Without this explicit check, a customer could pass
-- another customer's measurement id and have it attached to their order —
-- an IDOR that the surrounding RLS would normally have prevented.
--
-- The old 8-argument signature is dropped rather than left in place: keeping
-- both would make a call with 8 arguments ambiguous against the new version's
-- defaulted 9th parameter.
-- ============================================================================

drop function if exists create_order(uuid, uuid, int, text, text, text, text, text);

create or replace function create_order(
  p_service_id uuid,
  p_city_id uuid,
  p_qty int,
  p_address_line text,
  p_address_landmark text,
  p_address_pincode text,
  p_contact_phone text,
  p_customer_note text,
  p_measurement_id uuid default null
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

  insert into order_items (order_id, service_id, measurement_id, qty, unit_price)
  values (v_order_id, p_service_id, p_measurement_id, p_qty, v_price);

  return v_order_id;
end;
$$;

revoke execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid) from public;
grant execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid) to authenticated;
