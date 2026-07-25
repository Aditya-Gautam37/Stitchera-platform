-- ============================================================================
-- STITCHERA — Admin panel support: RBAC hardening + missing write policies
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- (Run 0001_init.sql first if you haven't already.)
-- ============================================================================

-- ============================================================================
-- 1. CLOSE A PRIVILEGE-ESCALATION HOLE
--
-- "own profile update" (from 0001) lets any user update their own profiles
-- row with no column restriction. RLS only gates which ROWS you can touch,
-- not which COLUMNS — so a customer could currently PATCH their own row and
-- set role='admin'. This trigger clamps role/city_id/is_active back to their
-- previous values unless the actor is already an admin.
-- ============================================================================

create or replace function prevent_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin() then
    new.role      := old.role;
    new.city_id   := old.city_id;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_privilege_escalation
  before update on profiles
  for each row execute function prevent_privilege_escalation();

-- ============================================================================
-- 2. WRITE POLICIES FOR ADMIN-MANAGED CATALOG TABLES
--
-- 0001 only ever gave cities / services / city_service_prices SELECT
-- policies. With RLS enabled and no INSERT/UPDATE/DELETE policy, those
-- commands are denied outright — the admin app couldn't create or edit a
-- city, service, or price override at all. These policies fix that,
-- admin-only.
-- ============================================================================

create policy "admin manages cities" on cities
  for all using (is_admin()) with check (is_admin());

create policy "admin manages services" on services
  for all using (is_admin()) with check (is_admin());

create policy "admin manages city prices" on city_service_prices
  for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- 3. AFTER RUNNING: promote your own account to admin (if you haven't)
--   update profiles
--   set role = 'admin',
--       city_id = (select id from cities where name = 'Kanpur')
--   where phone = '+91XXXXXXXXXX';
-- ============================================================================
