-- ============================================================================
-- STITCHERA — Live chat (Phase I)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
-- (Run 0001-0012 first.)
--
-- One open thread per customer at a time. A customer always talks to
-- "Stitchera support" as a whole, not a named agent, so any admin or
-- city_manager can see and reply to any thread — there's exactly one city
-- live today, and gating this by city_id would need a city to be known
-- before a customer has even placed an order, which isn't always true.
-- pickup_agent is deliberately excluded: chat is a support/ops function,
-- same boundary already drawn around tailors/customers/applications.
-- ============================================================================

create table chat_threads (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references profiles(id) on delete cascade,
  status          text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- A customer can have at most one open thread — reopening means sending a
-- new message on the existing one, not spawning a second thread. Staff
-- close a thread once resolved; get_or_create_chat_thread() below then
-- opens a fresh one on the customer's next message.
create unique index idx_chat_threads_one_open on chat_threads(customer_id) where status = 'open';
create index idx_chat_threads_last_message on chat_threads(last_message_at desc);

create table chat_messages (
  id          bigserial primary key,
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  sender_id   uuid not null references profiles(id),
  sender_role text not null check (sender_role in ('customer', 'staff')),
  body        text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at  timestamptz not null default now()
);

create index idx_chat_messages_thread on chat_messages(thread_id, created_at);

alter table chat_threads  enable row level security;
alter table chat_messages enable row level security;

-- ============================================================================
-- THREADS — no direct insert policy for anyone. The only legal way to create
-- one is get_or_create_chat_thread() below (SECURITY DEFINER), which is what
-- stops a client from inserting a thread with someone else's customer_id.
-- ============================================================================

create policy "customer sees own thread" on chat_threads for select
  using (customer_id = auth.uid());

create policy "staff sees all threads" on chat_threads for select
  using (my_role() in ('admin', 'city_manager'));

create policy "staff closes threads" on chat_threads for update
  using (my_role() in ('admin', 'city_manager'))
  with check (my_role() in ('admin', 'city_manager'));

-- ============================================================================
-- MESSAGES — sender_id/sender_role are asserted in the WITH CHECK, not
-- trusted from the client: a customer can only post as themselves into
-- their own open thread, and staff can only post as 'staff' into any open
-- thread. Both sides can always read a thread they're a party to.
-- ============================================================================

create policy "customer reads own thread messages" on chat_messages for select
  using (exists (
    select 1 from chat_threads t
    where t.id = thread_id and t.customer_id = auth.uid()
  ));

create policy "staff reads all thread messages" on chat_messages for select
  using (my_role() in ('admin', 'city_manager'));

create policy "customer sends own thread messages" on chat_messages for insert
  with check (
    sender_id = auth.uid() and sender_role = 'customer'
    and exists (
      select 1 from chat_threads t
      where t.id = thread_id and t.customer_id = auth.uid() and t.status = 'open'
    )
  );

create policy "staff sends thread messages" on chat_messages for insert
  with check (
    sender_id = auth.uid() and sender_role = 'staff'
    and my_role() in ('admin', 'city_manager')
    and exists (select 1 from chat_threads t where t.id = thread_id and t.status = 'open')
  );

-- ============================================================================
-- Bump the thread's last_message_at whenever a message lands, so the staff
-- thread list can sort by recency without joining/aggregating chat_messages
-- on every page load.
-- ============================================================================

create or replace function touch_chat_thread()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update chat_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger t_touch_chat_thread after insert on chat_messages
  for each row execute function touch_chat_thread();

-- ============================================================================
-- get_or_create_chat_thread() — the sole entry point for thread creation.
-- SECURITY DEFINER so it can insert past the "no insert policy" lockdown
-- above, but it only ever inserts a row with customer_id = auth.uid(), so
-- that lockdown still holds against every other path. The ON CONFLICT
-- target matches idx_chat_threads_one_open exactly, making this safe to
-- call every time a customer opens the chat page, not just the first time.
-- ============================================================================

create or replace function get_or_create_chat_thread()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_thread_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into chat_threads (customer_id)
  values (auth.uid())
  on conflict (customer_id) where status = 'open' do nothing;

  select id into v_thread_id from chat_threads
    where customer_id = auth.uid() and status = 'open'
    limit 1;

  return v_thread_id;
end;
$$;

revoke execute on function get_or_create_chat_thread() from public;
grant execute on function get_or_create_chat_thread() to authenticated;

-- ============================================================================
-- REALTIME — Postgres changes on these tables are broadcast subject to the
-- RLS policies above (Supabase evaluates postgres_changes as the
-- subscriber's own authenticated role), so this doesn't widen access.
-- ============================================================================

alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table chat_threads;
