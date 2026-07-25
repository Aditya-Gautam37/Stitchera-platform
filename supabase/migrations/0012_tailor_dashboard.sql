-- ============================================================================
-- STITCHERA — Tailor login and self-service order updates
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0011 first.)
--
-- tailors.profile_id and the "tailor sees self" / "tailor sees assigned
-- orders" / "tailor sees own payouts" RLS policies have existed since 0001,
-- but nothing in the app ever gave a tailor anywhere to sign in and land —
-- those policies were read-only and completely dormant. This lets a linked
-- tailor account actually do one meaningful thing itself: mark an order
-- ready once they've finished stitching it. Nothing else — assignment,
-- confirmation, pickup, QC, and delivery stay staff actions.
--
-- Deliberately NOT modeled as profiles.role = 'tailor' (that enum value has
-- existed since 0001 and is still unused after this migration too). A
-- tailor identity is "a tailors row with profile_id = you," independent of
-- whatever profiles.role says — someone can be a tailor AND still book as
-- an ordinary customer with the same account, which the role-exclusive
-- model the staff roles use doesn't allow and shouldn't have to here.
-- ============================================================================

create policy "tailor updates own assigned order" on orders for update
  using (tailor_id in (select id from tailors where profile_id = auth.uid()))
  with check (tailor_id in (select id from tailors where profile_id = auth.uid()));

-- ============================================================================
-- "tailor sees assigned orders" (0001) only covers the orders row itself.
-- Without the two policies below, a tailor's order detail page can see the
-- order but every order_items row (and the measurement each one points to)
-- stays invisible under "order items readable" / "own measurements" — the
-- one thing a tailor actually needs (what to stitch, to what measurements)
-- would silently render as empty rather than erroring, so this has to ship
-- alongside the dashboard, not as a follow-up.
-- ============================================================================

create policy "tailor sees assigned order items" on order_items for select
  using (exists (
    select 1 from orders o
    join tailors t on t.id = o.tailor_id
    where o.id = order_items.order_id and t.profile_id = auth.uid()
  ));

create policy "tailor sees measurements on assigned orders" on measurements for select
  using (exists (
    select 1 from order_items oi
    join orders o on o.id = oi.order_id
    join tailors t on t.id = o.tailor_id
    where oi.measurement_id = measurements.id and t.profile_id = auth.uid()
  ));

-- ============================================================================
-- Extend restrict_customer_order_update() (0003) to branch on WHO the
-- non-staff actor is, rather than assuming "not staff" always means
-- "the owning customer." It now covers two narrow, distinct cases:
--   1. The owning customer cancelling from placed/confirmed (unchanged).
--   2. The assigned tailor moving their own order from with_tailor to
--      ready — and nothing else, on any other column.
-- Anyone else hitting this trigger (a mismatched tailor, a stranger) falls
-- through to the customer-cancel branch and gets rejected there, since
-- they're neither the owning customer nor a matching row exists in the
-- tailor check.
-- ============================================================================

create or replace function restrict_customer_order_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if is_staff() then
    return new;
  end if;

  if exists (select 1 from tailors where id = old.tailor_id and profile_id = auth.uid()) then
    if new.status is distinct from 'ready' or old.status <> 'with_tailor' then
      raise exception 'You can only mark an order ready while it is with you';
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
    new.handling_charge   := old.handling_charge;
    new.surge_charge      := old.surge_charge;
    new.advance_required  := old.advance_required;
    new.payment_preference:= old.payment_preference;
    new.discount          := old.discount;
    new.grand_total       := old.grand_total;
    new.commission_amount := old.commission_amount;
    new.tailor_payout     := old.tailor_payout;
    new.payment_status    := old.payment_status;
    new.payment_mode      := old.payment_mode;
    new.internal_note     := old.internal_note;
    new.cancel_reason     := old.cancel_reason;
    new.picked_up_at      := old.picked_up_at;
    new.assigned_at       := old.assigned_at;
    new.delivered_at      := old.delivered_at;
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
  new.handling_charge   := old.handling_charge;
  new.surge_charge      := old.surge_charge;
  new.advance_required  := old.advance_required;
  new.payment_preference:= old.payment_preference;
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
