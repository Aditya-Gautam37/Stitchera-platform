-- ============================================================================
-- STITCHERA — DPDP mechanism: consent capture + deletion request path
-- (AUDIT.md HIGH #3)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0016 first.)
--
-- This is the MECHANISM only — not legal policy text (that's the actual
-- /privacy content, marked DRAFT until reviewed) and not an automated
-- erasure pipeline (a real one would need to touch every table that
-- references profiles.id; this is the request-and-triage path a solo
-- founder can operate manually at pilot volume).
-- ============================================================================

alter table profiles
  add column consent_given_at timestamptz,
  add column consent_version text;

create table deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  created_at  timestamptz not null default now(),
  actioned_by uuid references profiles(id),
  actioned_at timestamptz
);

-- One open request at a time — resubmitting while already pending would
-- just be noise for whoever triages these.
create unique index idx_one_pending_deletion_request
  on deletion_requests(profile_id) where status = 'pending';

alter table deletion_requests enable row level security;

create policy "customer creates own deletion request" on deletion_requests for insert
  with check (profile_id = auth.uid());

create policy "customer sees own deletion request" on deletion_requests for select
  using (profile_id = auth.uid());

-- Admin-only, same reasoning as subscription grants and role changes: this
-- is a privilege/access decision, not routine city-ops triage.
create policy "admin manages deletion requests" on deletion_requests for all
  using (is_admin())
  with check (is_admin());
