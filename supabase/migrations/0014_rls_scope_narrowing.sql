-- ============================================================================
-- STITCHERA — Narrow RLS over-exposure (AUDIT.md HIGH #1) + fix a live
-- infinite-recursion bug the same policies were causing
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0013 first.)
--
-- AUDIT.md flagged three policies granting full-row access where the app
-- only needs a couple of columns: a tailor's phone/commission_pct/notes/
-- id_proof_url exposed to any customer with an order referencing that
-- tailor ("customer sees assigned tailor", 0008); a pickup agent's
-- phone/email exposed the same way ("customer sees assigned pickup
-- agent", 0008); and a customer's full street address exposed to the
-- tailor who never visits the home ("tailor sees assigned orders", 0001).
--
-- Testing this against a real Postgres instance (not just reading the
-- policies) surfaced something worse than over-exposure: "customer sees
-- assigned tailor" and "tailor sees assigned orders" reference each other
-- in a raw EXISTS/IN subquery. Postgres's RLS rewriter can't resolve that
-- — it's a structural cycle, not a data question — and it throws
-- "infinite recursion detected in policy" for ANY query touching
-- `tailors`, by ANY role, in ANY context. That transitively broke:
--   - every query against `tailors` (admin tailors pages, a tailor's own
--     requireTailor() gate)
--   - the customer order-detail page (embeds tailor:tailors(name))
--   - the tailor's own order-items/measurements read ("what to stitch")
--   - the tailor's "mark ready" UPDATE itself — verified: the UPDATE
--     policy's own subquery into `tailors` recurses the same way, so
--     markOrderReady() has been failing outright, not just over-exposing
--     data.
--
-- Fix: my_tailor_id() does the same "which tailor row is this login"
-- lookup the old policies did inline, but as SECURITY DEFINER — same
-- reasoning as my_role()/is_staff() being SECURITY DEFINER since 0001
-- ("so they can read profiles without tripping RLS recursion"). That
-- breaks the cycle: resolving "my tailor id" no longer re-triggers
-- `tailors`' own RLS.
-- ============================================================================

create or replace function my_tailor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from tailors where profile_id = auth.uid()
$$;

revoke execute on function my_tailor_id() from public;
grant execute on function my_tailor_id() to authenticated;

-- ----------------------------------------------------------------------------
-- Recursion fix: rewrite every policy that used a raw subquery into
-- `tailors` to key off tailor_id = my_tailor_id() instead. Same rows
-- visible/updatable as before — this section only removes the cycle.
-- ----------------------------------------------------------------------------

drop policy if exists "tailor sees assigned orders" on orders;
create policy "tailor sees assigned orders" on orders for select
  using (tailor_id = my_tailor_id());

drop policy if exists "tailor updates own assigned order" on orders;
create policy "tailor updates own assigned order" on orders for update
  using (tailor_id = my_tailor_id())
  with check (tailor_id = my_tailor_id());

drop policy if exists "tailor sees assigned order items" on order_items;
create policy "tailor sees assigned order items" on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id and o.tailor_id = my_tailor_id()
  ));

drop policy if exists "tailor sees measurements on assigned orders" on measurements;
create policy "tailor sees measurements on assigned orders" on measurements for select
  using (exists (
    select 1 from order_items oi
    join orders o on o.id = oi.order_id
    where oi.measurement_id = measurements.id and o.tailor_id = my_tailor_id()
  ));

-- ----------------------------------------------------------------------------
-- Over-exposure fix: a customer no longer gets full-row SELECT on
-- `tailors`/`profiles` for their assigned provider — just a name, via a
-- view exposing only what the review-form UI actually renders. Views
-- created without security_invoker run as their owner (same pattern as
-- public_tailors, 0008): they bypass RLS on the tables they scan
-- entirely, which also means they're immune to the recursion above
-- regardless of what state the base policies are in.
-- ----------------------------------------------------------------------------

drop policy if exists "customer sees assigned tailor" on tailors;

create view customer_assigned_tailors as
select o.id as order_id, t.id as tailor_id, t.name, t.shop_name, t.rating, t.specialities
from orders o
join tailors t on t.id = o.tailor_id
where o.customer_id = auth.uid();

grant select on customer_assigned_tailors to authenticated;

drop policy if exists "customer sees assigned pickup agent" on profiles;

create view customer_assigned_pickup_agents as
select o.id as order_id, p.id as pickup_agent_id, p.full_name
from orders o
join profiles p on p.id = o.pickup_agent_id
where o.customer_id = auth.uid() and o.pickup_agent_id is not null;

grant select on customer_assigned_pickup_agents to authenticated;
