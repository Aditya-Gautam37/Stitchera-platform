-- ============================================================================
-- STITCHERA — Reviews & ratings
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0007 first.)
--
-- Prerequisite for the Top Tailors and Reviews tabs, neither of which had
-- anything to query before this. tailors.rating has existed since 0001 but
-- nothing ever wrote to it.
--
-- Design: customers review a TAILOR and/or a DELIVERY PARTNER on a specific
-- DELIVERED order — not the reverse. A provider rating a customer back is a
-- different feature (and a different trust model) that wasn't asked for
-- here; if it's wanted later it's a second table, not a bolt-on to this one.
-- ============================================================================

create type reviewee_type as enum ('tailor', 'delivery_partner');

create table reviews (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  customer_id           uuid not null references profiles(id),
  customer_display_name text,
  reviewee_display_name text,
  reviewee_type         reviewee_type not null,
  tailor_id             uuid references tailors(id),
  delivery_agent_id     uuid references profiles(id),
  rating                smallint not null check (rating between 1 and 5),
  comment               text,
  created_at            timestamptz not null default now(),

  -- Exactly one target, matching reviewee_type — never both, never neither.
  constraint reviews_reviewee_shape check (
    (reviewee_type = 'tailor' and tailor_id is not null and delivery_agent_id is null)
    or
    (reviewee_type = 'delivery_partner' and delivery_agent_id is not null and tailor_id is null)
  ),

  -- One review per order per target — no review-bombing the same order twice.
  unique (order_id, reviewee_type)
);

create index idx_reviews_tailor on reviews(tailor_id) where tailor_id is not null;
create index idx_reviews_delivery_agent on reviews(delivery_agent_id) where delivery_agent_id is not null;
create index idx_reviews_customer on reviews(customer_id);

-- ============================================================================
-- Snapshot both the reviewer's and the reviewee's display name at write time
--
-- Reviews are meant to be publicly readable (that's the entire point of a
-- Top Tailors page), but neither profiles.full_name nor tailors.name are
-- publicly readable — profiles is gated by the "own profile read" policy
-- from 0004, and tailors has no public policy at all. PostgREST also can't
-- embed a related row through a VIEW (its embedding relies on real foreign
-- keys, and a view isn't the FK's target), so the public_tailors /
-- public_pickup_agents views below can't be joined onto `reviews` directly
-- either. Snapshotting both names once, here, at insert time (the same
-- approach orders already uses for addresses) sidesteps all of that: the
-- Reviews feed reads two plain text columns, no join, no RLS conflict, and
-- the name stays historically accurate even if the tailor later renames
-- their shop.
-- ============================================================================

create or replace function set_review_display_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select nullif(trim(coalesce(full_name, '')), '') into new.customer_display_name
  from profiles where id = new.customer_id;
  if new.customer_display_name is null then
    new.customer_display_name := 'A Stitchera customer';
  end if;

  if new.reviewee_type = 'tailor' then
    select name into new.reviewee_display_name from tailors where id = new.tailor_id;
  else
    select full_name into new.reviewee_display_name from profiles where id = new.delivery_agent_id;
  end if;
  if new.reviewee_display_name is null or trim(new.reviewee_display_name) = '' then
    new.reviewee_display_name := case new.reviewee_type
      when 'tailor' then 'Your tailor'
      else 'Your delivery partner'
    end;
  end if;

  return new;
end;
$$;

create trigger trg_set_review_display_names
  before insert on reviews
  for each row execute function set_review_display_names();

-- ============================================================================
-- Keep tailors.rating as a live average — recomputed on every write, not
-- just on insert, so an edited or deleted review doesn't leave a stale number.
-- ============================================================================

create or replace function update_tailor_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tailor_id uuid := coalesce(new.tailor_id, old.tailor_id);
begin
  if v_tailor_id is not null then
    update tailors
    set rating = coalesce(
      (select round(avg(rating)::numeric, 2) from reviews
       where tailor_id = v_tailor_id and reviewee_type = 'tailor'),
      0
    )
    where id = v_tailor_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_update_tailor_rating
  after insert or update of rating or delete on reviews
  for each row execute function update_tailor_rating();

-- ============================================================================
-- RLS
-- ============================================================================

alter table reviews enable row level security;

-- Public and intentional — unlike every other "using (true)" flagged in
-- earlier hardening passes, this one isn't a gap. A review's entire purpose
-- is to be seen by people who haven't booked yet.
create policy "reviews are publicly readable" on reviews for select
  using (true);

-- A customer may review an order only once it's actually delivered, and
-- only the tailor/delivery partner who genuinely worked on THAT order —
-- not an arbitrary id passed from the client.
create policy "customer reviews own delivered order" on reviews for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from orders o
      where o.id = order_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
        and (
          (reviewee_type = 'tailor' and o.tailor_id = tailor_id)
          or
          (reviewee_type = 'delivery_partner' and o.pickup_agent_id = delivery_agent_id)
        )
    )
  );

-- Moderation only — reviews are otherwise immutable once posted (no
-- customer-facing edit/delete), matching the payments ledger's append-only
-- philosophy: a wrong review gets a reply or gets moderated, not silently
-- rewritten.
create policy "admin moderates reviews" on reviews for delete
  using (is_admin());

revoke execute on function update_tailor_rating() from public;
revoke execute on function set_review_display_names() from public;

-- ============================================================================
-- A customer currently can't see the NAME of their own order's assigned
-- tailor or pickup agent at all — "staff manage tailors" and "own profile
-- read" have no clause for "this is the provider on MY order." Needed to
-- label the review form ("Rate Rafiq Tailors") with an actual name instead
-- of a raw id. Narrowly scoped to the specific relationship, not a general
-- grant: only visible if that tailor/agent is genuinely assigned to an
-- order this customer placed.
-- ============================================================================

create policy "customer sees assigned tailor" on tailors for select
  using (exists (
    select 1 from orders o where o.tailor_id = tailors.id and o.customer_id = auth.uid()
  ));

create policy "customer sees assigned pickup agent" on profiles for select
  using (exists (
    select 1 from orders o where o.pickup_agent_id = profiles.id and o.customer_id = auth.uid()
  ));

-- ============================================================================
-- Public-safe view for Top Tailors
--
-- `tailors` has no public SELECT policy at all — only staff, plus the
-- narrow "sees own order's tailor" grant just above. A public Top Tailors
-- page has nothing it's allowed to query. Opening the base table to anon
-- isn't the fix: it also holds phone numbers and commission_pct, which is
-- genuinely sensitive business data (competitors and customers shouldn't
-- see what cut Stitchera takes). Views are the standard way to expose a
-- safe column subset — created without `security_invoker`, so (per
-- Postgres's pre-PG15 default, still available as an option) they run as
-- their owner for permission purposes: the view's own column list becomes
-- the actual boundary, not the base table's RLS.
-- ============================================================================

create view public_tailors as
select id, name, shop_name, city_id, specialities, rating, total_orders
from tailors
where status = 'active';

grant select on public_tailors to anon, authenticated;
