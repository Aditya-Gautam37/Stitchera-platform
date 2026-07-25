-- ============================================================================
-- STITCHERA — Subscription purchase flow
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0010 first.)
--
-- Phase E introduced the 3-free-bookings cap and customer_subscriptions,
-- but the only way to actually get a subscription was an admin manually
-- granting one — there was no real purchase flow, and no prices existed
-- anywhere. This closes that gap.
--
-- PRICING NOTE: the blueprint never specified what each plan costs. The
-- prices below (₹99/₹199/₹399/₹799 monthly, ascending with the "royal
-- luxury" positioning) are placeholders so the flow has something real to
-- charge — edit them freely from /admin/subscriptions once this migration
-- runs. Nothing about the purchase logic depends on these specific numbers.
-- ============================================================================

create table subscription_plans (
  key                text primary key check (key in ('karigar', 'ustad', 'meher', 'shahi')),
  name               text not null,
  tagline            text not null,
  price              numeric(10,2) not null check (price >= 0),
  billing_period_days int not null default 30 check (billing_period_days > 0),
  is_active          boolean not null default true,
  sort_order         int not null default 0
);

insert into subscription_plans (key, name, tagline, price, sort_order) values
  ('karigar', 'Karigar', 'Skilled artisan', 99, 1),
  ('ustad',   'Ustad',   'Master craftsman', 199, 2),
  ('meher',   'Meher',   'Grace & elegance', 399, 3),
  ('shahi',   'Shahi',   'Royal luxury', 799, 4);

alter table subscription_plans enable row level security;

create policy "plans are publicly readable" on subscription_plans for select
  using (is_active);

create policy "admin manages plans" on subscription_plans for all
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- Round out customer_subscriptions for real purchases
-- ============================================================================

alter table customer_subscriptions
  add column price_paid numeric(10,2),
  add column payment_preference payment_preference;

-- One ACTIVE subscription per customer at a time — buying a new plan
-- replaces the old one (handled by purchase_subscription() below), it
-- doesn't stack.
create unique index idx_one_active_subscription
  on customer_subscriptions(profile_id)
  where status = 'active';

-- ============================================================================
-- purchase_subscription() — SECURITY DEFINER, same reasoning as
-- create_order()/record_payment(): customer_subscriptions intentionally has
-- no customer-facing INSERT policy (only "customer sees own" and
-- "admin manages"), so a plain client-side insert would be blocked by RLS
-- regardless. This function is the one controlled path, validates the plan
-- is real and active, and does NOT auto-record a completed payment — it
-- stores payment_preference exactly like orders do, and an actual
-- collection still has to be confirmed by staff (there's no real payment
-- gateway wired up yet, same as checkout).
-- ============================================================================

create or replace function purchase_subscription(
  p_plan text,
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
  v_billing_days int;
  v_sub_id uuid;
begin
  if v_customer_id is null then
    raise exception 'Not authenticated';
  end if;

  select price, billing_period_days into v_price, v_billing_days
    from subscription_plans where key = p_plan and is_active;
  if not found then
    raise exception 'That plan is not available';
  end if;

  update customer_subscriptions
  set status = 'cancelled'
  where profile_id = v_customer_id and status = 'active';

  insert into customer_subscriptions (
    profile_id, plan, status, started_at, expires_at, price_paid, payment_preference
  ) values (
    v_customer_id, p_plan, 'active', now(), now() + (v_billing_days || ' days')::interval,
    v_price, p_payment_preference
  )
  returning id into v_sub_id;

  return v_sub_id;
end;
$$;

revoke execute on function purchase_subscription(text, payment_preference) from public;
grant execute on function purchase_subscription(text, payment_preference) to authenticated;
