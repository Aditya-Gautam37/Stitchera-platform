-- ============================================================================
-- STITCHERA — Production readiness hardening
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- (Run 0001_init.sql and 0002_admin_and_rbac.sql first.)
-- ============================================================================

-- ============================================================================
-- 1. ORDER_ITEMS: STOP CUSTOMERS FROM EDITING ITEMS AFTER STAFF TOUCHES THE ORDER
--
-- The original "order items follow order" policy let a customer insert,
-- update, or delete their own order's line items at ANY status — including
-- after it's confirmed, with the tailor, or delivered. A customer could
-- delete/alter line items after the fact, corrupting the invoice and
-- payout math (order.grand_total wouldn't move with them, so it would just
-- silently disagree with the item rows). Split into three policies: broad
-- read, unrestricted staff write, and customer write ONLY while the order
-- is still 'placed' (before staff has acted on it).
-- ============================================================================

drop policy if exists "order items follow order" on order_items;

create policy "order items readable" on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_id and (o.customer_id = auth.uid() or is_staff())
  ));

create policy "staff manage order items" on order_items for all
  using (exists (select 1 from orders o where o.id = order_id and is_staff()))
  with check (exists (select 1 from orders o where o.id = order_id and is_staff()));

create policy "customer manages own placed order items" on order_items for all
  using (exists (
    select 1 from orders o
    where o.id = order_id and o.customer_id = auth.uid() and o.status = 'placed'
  ))
  with check (exists (
    select 1 from orders o
    where o.id = order_id and o.customer_id = auth.uid() and o.status = 'placed'
  ));

-- ============================================================================
-- 2. LET CUSTOMERS CANCEL THEIR OWN ORDER (WHILE IT'S STILL CANCELLABLE)
--
-- There was no path for a customer to cancel an order at all — no RLS
-- policy allowed them to touch `orders` after creating it. This adds a
-- narrow one (only 'placed'/'confirmed' -> 'cancelled'), and a trigger
-- that clamps every other column back to its old value so a crafted
-- request can't ride along and change price/address/assignment too.
-- Mirrors the prevent_privilege_escalation() pattern from 0002.
-- ============================================================================

create policy "customer cancels own order" on orders for update
  using (customer_id = auth.uid() and status in ('placed', 'confirmed'))
  with check (customer_id = auth.uid());

create or replace function restrict_customer_order_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if is_staff() then
    return new;
  end if;

  if new.status is distinct from 'cancelled' or old.status not in ('placed', 'confirmed') then
    raise exception 'Orders can only be cancelled while placed or confirmed';
  end if;

  new.order_number      := old.order_number;
  new.customer_id       := old.customer_id;
  new.city_id           := old.city_id;
  new.address_line      := old.address_line;
  new.address_landmark  := old.address_landmark;
  new.address_pincode   := old.address_pincode;
  new.contact_phone     := old.contact_phone;
  new.pickup_agent_id   := old.pickup_agent_id;
  new.pickup_slot_start := old.pickup_slot_start;
  new.pickup_slot_end   := old.pickup_slot_end;
  new.tailor_id         := old.tailor_id;
  new.promised_date     := old.promised_date;
  new.delivery_agent_id := old.delivery_agent_id;
  new.items_total       := old.items_total;
  new.visit_charge      := old.visit_charge;
  new.delivery_charge   := old.delivery_charge;
  new.discount          := old.discount;
  new.grand_total       := old.grand_total;
  new.commission_amount := old.commission_amount;
  new.tailor_payout     := old.tailor_payout;
  new.payment_status    := old.payment_status;
  new.payment_mode      := old.payment_mode;
  new.internal_note     := old.internal_note;
  new.picked_up_at      := old.picked_up_at;
  new.assigned_at       := old.assigned_at;
  new.ready_at          := old.ready_at;
  new.delivered_at      := old.delivered_at;
  return new;
end;
$$;

create trigger trg_restrict_customer_order_update
  before update on orders
  for each row execute function restrict_customer_order_update();

-- ============================================================================
-- 3. AUTO-TRACK TAILOR ORDER COUNT
--
-- tailors.total_orders existed but nothing ever incremented it — it would
-- have stayed 0 forever. Fires once, exactly when an order transitions
-- INTO 'delivered' (not on every update), and only if a tailor is assigned.
-- ============================================================================

create or replace function increment_tailor_order_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'delivered'
     and new.tailor_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then
    update tailors set total_orders = total_orders + 1 where id = new.tailor_id;
  end if;
  return new;
end;
$$;

create trigger trg_increment_tailor_orders
  after insert or update of status on orders
  for each row execute function increment_tailor_order_count();

-- ============================================================================
-- 4. DEFENSE-IN-DEPTH: CHECK CONSTRAINTS ON MONEY/QUANTITY COLUMNS
--
-- Nothing stopped a negative price, a >100% commission, or a zero-day
-- turnaround from being written directly via the API, bypassing whatever
-- the app's <input min="0"> happened to enforce client-side.
-- ============================================================================

alter table services
  add constraint services_base_price_nonneg check (base_price >= 0),
  add constraint services_est_days_positive check (est_days > 0);

alter table cities
  add constraint cities_charges_nonneg check (
    visit_charge >= 0 and delivery_charge >= 0 and min_order_value >= 0
  );

alter table tailors
  add constraint tailors_commission_range check (commission_pct >= 0 and commission_pct <= 100),
  add constraint tailors_capacity_positive check (daily_capacity > 0);

alter table city_service_prices
  add constraint city_service_prices_nonneg check (price >= 0);

alter table orders
  add constraint orders_amounts_nonneg check (
    items_total >= 0 and visit_charge >= 0 and delivery_charge >= 0 and
    discount >= 0 and grand_total >= 0 and commission_amount >= 0 and tailor_payout >= 0
  );

-- ============================================================================
-- 5. MISSING INDEXES
--
-- orders.pickup_agent_id backs the staff "assigned to me" filter and had no
-- index at all (full table scan at scale). The other two are composite
-- indexes for the exact (role, city) and (city, status) filters the admin
-- panel runs on every page load.
-- ============================================================================

create index idx_orders_pickup_agent on orders(pickup_agent_id);
create index idx_profiles_role_city on profiles(role, city_id);
create index idx_tailors_city_status on tailors(city_id, status);

-- ============================================================================
-- 6. TIGHTEN city_service_prices READ POLICY
--
-- "prices readable" used `using (true)` — anyone with the anon key could
-- read every price override for every city/service, including inactive
-- ones never meant to be public. Match the same active-or-staff pattern
-- already used for cities/services.
-- ============================================================================

drop policy if exists "prices readable" on city_service_prices;

create policy "prices readable" on city_service_prices for select
  using (
    is_staff()
    or (
      is_active
      and exists (select 1 from cities c where c.id = city_id and c.is_active)
      and exists (select 1 from services s where s.id = service_id and s.is_active)
    )
  );

-- ============================================================================
-- 7. ATOMIC, SERVER-PRICED ORDER CREATION
--
-- The app previously did two separate REST calls (insert order, then insert
-- order_item). If the second failed, the first was left behind as an order
-- with zero items charged at a total that no longer matched anything. It
-- also hard-picked "the one active city" — the first city expansion beyond
-- Kanpur would have made `.single()` throw, and it never called the
-- `service_price()` function, so city-specific price overrides configured
-- in the admin panel were silently ignored at checkout. This function fixes
-- all three: one transaction, an explicit city, and authoritative pricing
-- computed here instead of trusted from the client.
-- ============================================================================

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
security invoker
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
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
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

grant execute on function create_order(uuid, uuid, int, text, text, text, text, text) to authenticated;

-- ============================================================================
-- 8. AGGREGATE ORDER STATS IN SQL INSTEAD OF PULLING EVERY ROW
--
-- The admin overview page was fetching every order's status/total/payment
-- columns and summing them in Node. That's fine at pilot volume but doesn't
-- scale — it's an unbounded query with no limit that gets slower and heavier
-- every single day forever. This does the count/sum/group-by in Postgres,
-- returning at most one row per status. Still `security invoker`, so the
-- existing orders SELECT policies keep scoping city_manager/pickup_agent to
-- their own city and admin to everything — this changes where the
-- aggregation happens, not who can see what.
-- ============================================================================

create or replace function order_stats()
returns table (
  status order_status,
  order_count bigint,
  revenue_paid numeric,
  placed_last_30d bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    status,
    count(*) as order_count,
    coalesce(sum(grand_total) filter (where payment_status = 'paid'), 0) as revenue_paid,
    count(*) filter (where placed_at >= now() - interval '30 days') as placed_last_30d
  from orders
  group by status;
$$;

grant execute on function order_stats() to authenticated;
