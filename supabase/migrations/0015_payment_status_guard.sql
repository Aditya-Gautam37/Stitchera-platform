-- ============================================================================
-- STITCHERA — record_payment() order-status guard (AUDIT.md HIGH #4)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0014 first.)
--
-- record_payment() (0005) never checked orders.status — the only thing
-- stopping a cancelled order from being marked paid was a UI `if` in the
-- admin page (app/(staff)/admin/orders/[id]/page.tsx), not the database.
-- Double-marking an ALREADY-paid order as paid again was already blocked
-- by the existing overcollection check (any additional amount pushes the
-- running total past grand_total once it's fully paid) — that part needed
-- no change.
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
  v_order_status order_status;
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
  select grand_total, status into v_grand_total, v_order_status
    from orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order_status = 'cancelled' then
    raise exception 'Cannot record a payment against a cancelled order';
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
