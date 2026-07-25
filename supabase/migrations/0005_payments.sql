-- ============================================================================
-- STITCHERA — Payments: recording collections, and the commission split
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0004 first.)
--
-- Until now `payments` existed but nothing could write to it from the app,
-- so every order sat at payment_status='pending' forever. commission_amount
-- and tailor_payout were likewise dead columns — nothing ever worked out
-- what Stitchera keeps versus what the tailor is owed.
-- ============================================================================

-- ============================================================================
-- 1. THE PAYMENTS LEDGER IS APPEND-ONLY
--
-- There is deliberately no UPDATE or DELETE policy on `payments`. A
-- collection record is a financial fact — correcting one means recording an
-- offsetting entry (a refund), never quietly editing or deleting history.
-- This block only adds the integrity constraints that were missing.
-- ============================================================================

alter table payments
  add constraint payments_amount_positive check (amount > 0),
  add constraint payments_status_valid check (status in ('success', 'failed', 'refunded'));

create index idx_payments_order_created on payments(order_id, created_at desc);

-- ============================================================================
-- 2. CITY-SCOPE THE PAYMENTS INSERT POLICY
--
-- 0004 city-scoped who can READ payments, but the INSERT policy from 0001
-- was still a flat `with check (is_staff())` — a city_manager in one city
-- could record a payment against an order belonging to a different city.
-- Money-touching writes need the same boundary as everything else.
-- ============================================================================

drop policy if exists "staff record payments" on payments;

create policy "staff record payments" on payments for insert
  with check (exists (
    select 1 from orders o
    where o.id = order_id and (is_admin() or (is_staff() and o.city_id = my_city()))
  ));

-- ============================================================================
-- 3. COMPUTE THE COMMISSION SPLIT WHEN A TAILOR IS ASSIGNED
--
-- The split is taken on items_total (the stitching work) — visit and
-- delivery charges are Stitchera's own logistics revenue and are not shared
-- with the tailor. Recomputed whenever the tailor or the items total
-- changes, so reassigning to a tailor on a different commission rate keeps
-- the numbers honest.
-- ============================================================================

create or replace function compute_order_split()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_commission_pct numeric(5,2);
begin
  if new.tailor_id is null then
    new.commission_amount := 0;
    new.tailor_payout := 0;
    return new;
  end if;

  select commission_pct into v_commission_pct from tailors where id = new.tailor_id;
  if v_commission_pct is null then
    v_commission_pct := 0;
  end if;

  new.commission_amount := round(new.items_total * v_commission_pct / 100, 2);
  new.tailor_payout := new.items_total - new.commission_amount;
  return new;
end;
$$;

create trigger trg_compute_order_split
  before insert or update of tailor_id, items_total on orders
  for each row execute function compute_order_split();

-- Backfill any orders that already have a tailor assigned.
update orders o
set commission_amount = round(o.items_total * t.commission_pct / 100, 2),
    tailor_payout = o.items_total - round(o.items_total * t.commission_pct / 100, 2)
from tailors t
where o.tailor_id = t.id;

-- ============================================================================
-- 4. RECORD A PAYMENT, ATOMICALLY, WITH THE ORDER STATUS DERIVED
--
-- payment_status is never set by hand — it's always computed from the sum of
-- successful payments against grand_total, in the same transaction as the
-- insert. That makes "how much has this customer actually paid" a single
-- source of truth (the ledger) rather than two values that can drift apart.
--
-- SECURITY INVOKER on purpose: the caller's own RLS decides whether they may
-- write this payment and touch this order. The function adds validation, not
-- privilege.
-- ============================================================================

create or replace function record_payment(
  p_order_id uuid,
  p_amount numeric,
  p_mode payment_mode,
  p_gateway_ref text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_grand_total numeric(10,2);
  v_already_paid numeric(10,2);
  v_payment_id uuid;
  v_new_total numeric(10,2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  -- RLS decides whether this row is visible; not found means not permitted.
  select grand_total into v_grand_total from orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  select coalesce(sum(amount), 0) into v_already_paid
    from payments where order_id = p_order_id and status = 'success';

  v_new_total := v_already_paid + p_amount;

  if v_new_total > v_grand_total then
    raise exception 'That would collect % more than the order total of %',
      round(v_new_total - v_grand_total, 2), v_grand_total;
  end if;

  insert into payments (order_id, amount, mode, gateway_ref, collected_by, status)
  values (p_order_id, p_amount, p_mode, nullif(trim(coalesce(p_gateway_ref, '')), ''), auth.uid(), 'success')
  returning id into v_payment_id;

  update orders
  set payment_status = case
        when v_new_total >= v_grand_total then 'paid'::payment_status
        else 'partial'::payment_status
      end,
      payment_mode = p_mode
  where id = p_order_id;

  return v_payment_id;
end;
$$;

revoke execute on function record_payment(uuid, numeric, payment_mode, text) from public;
grant execute on function record_payment(uuid, numeric, payment_mode, text) to authenticated;

-- ============================================================================
-- 5. OUTSTANDING-REVENUE REPORTING
--
-- Aggregated in SQL for the same reason order_stats() is: so the admin
-- overview never has to pull every order row into the app to add up money.
-- security invoker keeps each caller's city scoping intact.
-- ============================================================================

create or replace function revenue_stats()
returns table (
  collected numeric,
  outstanding numeric,
  orders_awaiting_payment bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(p.paid), 0) as collected,
    coalesce(sum(case when o.status <> 'cancelled' then o.grand_total - coalesce(p.paid, 0) else 0 end), 0) as outstanding,
    count(*) filter (where o.status <> 'cancelled' and coalesce(p.paid, 0) < o.grand_total) as orders_awaiting_payment
  from orders o
  left join (
    select order_id, sum(amount) as paid
    from payments where status = 'success'
    group by order_id
  ) p on p.order_id = o.id;
$$;

revoke execute on function revenue_stats() from public;
grant execute on function revenue_stats() to authenticated;
