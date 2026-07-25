-- ============================================================================
-- STITCHERA — Public order tracking (order number + phone, no login)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0006 first.)
--
-- Orders has no SELECT policy for anonymous visitors, so a guest "track your
-- order" page has nothing to query directly. A broad `using (true)` policy
-- would be unsafe here: RLS constrains which ROWS are visible, but has no way
-- to require that the client's query actually filtered by order_number AND
-- phone — an anonymous client could send a request with no filters at all and
-- read every order in the table. A SECURITY DEFINER function that does the
-- exact-match check itself, and returns only status (nothing financial, no
-- address, no other customer's data), is the safe version of the same feature.
-- ============================================================================

create or replace function track_order(p_order_number text, p_phone text)
returns table (order_number text, status order_status)
language sql
stable
security definer
set search_path = public
as $$
  select o.order_number, o.status
  from orders o
  where o.order_number = upper(trim(p_order_number))
    and o.contact_phone = trim(p_phone)
  limit 1;
$$;

revoke execute on function track_order(text, text) from public;
grant execute on function track_order(text, text) to anon, authenticated;
