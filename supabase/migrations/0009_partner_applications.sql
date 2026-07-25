-- ============================================================================
-- STITCHERA — Self-serve tailor & delivery-partner registration
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0008 first.)
--
-- Today, tailor and delivery-partner accounts only exist because staff
-- created them by hand in the admin panel. This adds the inbound path from
-- the blueprint's two homepage registration buttons: an applicant signs in,
-- fills a form, and staff reviews it — approval is still always a manual
-- staff decision, never automatic, for the reason explained below.
-- ============================================================================

create type applicant_type as enum ('tailor', 'delivery_partner');
create type application_status as enum ('pending', 'approved', 'rejected');

create table partner_applications (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  applicant_type    applicant_type not null,
  status            application_status not null default 'pending',

  full_name         text not null,
  phone             text not null,
  city_id           uuid not null references cities(id),

  -- tailor-only
  shop_name         text,
  address           text,
  specialities      text[] default '{}',
  daily_capacity    int,

  -- delivery-partner-only
  vehicle_type      text,

  -- Registration fee is recorded, not collected here — see the checkout
  -- payment stub decision (Phase E): the platform doesn't move real money
  -- yet, so this is bookkeeping for staff to reconcile offline, not a paid
  -- gate. fee_paid stays a manual staff toggle until real payments exist.
  registration_fee  numeric(10,2) not null,
  fee_paid          boolean not null default false,

  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),

  constraint partner_applications_shape check (
    (applicant_type = 'tailor' and vehicle_type is null)
    or
    (applicant_type = 'delivery_partner' and shop_name is null and address is null and daily_capacity is null)
  )
);

-- One OPEN application per person per type — re-applying after a rejection
-- is allowed (that's a new row), but you can't queue five pending ones.
create unique index idx_one_pending_application
  on partner_applications(profile_id, applicant_type)
  where status = 'pending';

create index idx_applications_city_status on partner_applications(city_id, status);

alter table partner_applications enable row level security;

create policy "applicant creates own application" on partner_applications for insert
  with check (profile_id = auth.uid());

create policy "applicant views own application" on partner_applications for select
  using (profile_id = auth.uid());

create policy "staff manages applications" on partner_applications for all
  using (is_admin() or (is_staff() and city_id = my_city()))
  with check (is_admin() or (is_staff() and city_id = my_city()));

-- ============================================================================
-- Why approval always happens in a Server Action, never a raw UPDATE
--
-- Approving a delivery_partner application means setting
-- profiles.role = 'pickup_agent' — which is a STAFF role (is_staff()
-- includes pickup_agent). The prevent_privilege_escalation() trigger from
-- 0002 already clamps role/city_id/is_active changes back to their old
-- values unless the acting user is_admin() — so even if the RLS policy
-- above lets a city_manager UPDATE the applications row, the actual
-- profiles role change silently no-ops for anyone but an admin. The
-- application code (Phase D) additionally gates delivery_partner approval
-- behind requireAdmin() specifically so that failure is an explicit
-- "not authorized" error instead of a silent no-op discovered later.
-- Approving a TAILOR application only inserts into `tailors` — no role
-- change involved — so city_manager approval is fine there, matching the
-- existing manual createTailor() permissions.
-- ============================================================================
