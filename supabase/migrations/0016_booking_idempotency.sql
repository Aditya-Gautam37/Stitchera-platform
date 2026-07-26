-- ============================================================================
-- STITCHERA — Idempotent order creation (AUDIT.md HIGH #2)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0015 first.)
--
-- The only protection against a double-submit was SubmitButton disabling
-- itself once React registers the pending state, plus a throttle that only
-- blocks a customer's 4th booking attempt in 2 minutes — neither stops a
-- genuine double-tap's first two attempts from both succeeding as two real,
-- separately-charged orders. The client now generates one key per page
-- render (not per tap) and sends it with every submission of that same
-- loaded form; a retry with the same key returns the original order.
-- ============================================================================

alter table orders add column idempotency_key uuid;

-- Per-customer, not global: a null key (an older client, or a call that
-- doesn't set one) is never treated as a collision with anything.
create unique index idx_orders_customer_idempotency
  on orders(customer_id, idempotency_key)
  where idempotency_key is not null;

drop function if exists create_order(uuid, uuid, int, text, text, text, text, text, uuid, payment_preference);

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
  p_payment_preference payment_preference default 'cod',
  p_idempotency_key uuid default null
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

  -- Idempotency check first, before any other validation runs: a retry of
  -- an already-placed booking should return that same order regardless of
  -- whether the throttle/cap would otherwise reject a genuinely new one.
  if p_idempotency_key is not null then
    select id into v_order_id from orders
      where customer_id = v_customer_id and idempotency_key = p_idempotency_key;
    if found then
      return v_order_id;
    end if;
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

  v_local_hour := extract(hour from (now() at time zone 'Asia/Kolkata'));
  if v_local_hour >= 20 or v_local_hour < 6 then
    v_surge_charge := 10;
  end if;

  v_advance_required := round(
    v_items_total * (case when v_items_total >= 500 then 0.30 else 0.15 end),
    2
  );

  v_grand_total := v_items_total + v_handling_charge + v_surge_charge + v_delivery_charge;

  begin
    insert into orders (
      customer_id, city_id, address_line, address_landmark, address_pincode,
      contact_phone, items_total, visit_charge, delivery_charge, handling_charge,
      surge_charge, advance_required, payment_preference, grand_total, customer_note,
      idempotency_key
    ) values (
      v_customer_id, p_city_id, trim(p_address_line), nullif(trim(coalesce(p_address_landmark, '')), ''),
      p_address_pincode, trim(p_contact_phone), v_items_total, 0, v_delivery_charge, v_handling_charge,
      v_surge_charge, v_advance_required, p_payment_preference, v_grand_total,
      nullif(trim(coalesce(p_customer_note, '')), ''), p_idempotency_key
    )
    returning id into v_order_id;
  exception when unique_violation then
    -- Lost a genuine concurrent race against another request carrying the
    -- same key (two simultaneous taps) — return the winner's order instead
    -- of surfacing an error for what the customer experiences as one tap.
    select id into v_order_id from orders
      where customer_id = v_customer_id and idempotency_key = p_idempotency_key;
    return v_order_id;
  end;

  insert into order_items (order_id, service_id, measurement_id, qty, unit_price)
  values (v_order_id, p_service_id, p_measurement_id, p_qty, v_price);

  return v_order_id;
end;
$$;

revoke execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid, payment_preference, uuid) from public;
grant execute on function create_order(uuid, uuid, int, text, text, text, text, text, uuid, payment_preference, uuid) to authenticated;
