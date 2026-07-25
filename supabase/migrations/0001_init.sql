-- ============================================================================
-- STITCHERA — Database Schema v1
-- Target: Supabase (PostgreSQL 15+)
-- Scope:  Kanpur pilot, but multi-city safe from day one.
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

create type user_role as enum (
  'customer',
  'tailor',
  'pickup_agent',
  'city_manager',
  'admin'
);

-- The single most important thing in this database.
-- Every ops screen is a filter on orders.status.
create type order_status as enum (
  'placed',            -- customer submitted, not yet confirmed
  'confirmed',         -- office accepted the order
  'pickup_assigned',   -- pickup agent allotted
  'picked_up',         -- cloth + measurements collected
  'with_tailor',       -- handed to tailor
  'ready',             -- tailor says done
  'qc_failed',         -- failed quality check -> goes back to with_tailor
  'qc_passed',         -- quality check cleared
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create type payment_status as enum ('pending', 'partial', 'paid', 'refunded');
create type payment_mode   as enum ('cash', 'upi', 'card', 'netbanking', 'wallet');
create type fabric_source  as enum ('customer', 'stitchera');
create type tailor_status  as enum ('pending_verification', 'active', 'suspended', 'inactive');

-- ============================================================================
-- 2. CITIES
-- ============================================================================

create table cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_hi     text,
  state       text not null,
  pincodes    text[] default '{}',        -- serviceable pincodes
  is_active   boolean not null default false,
  visit_charge     numeric(10,2) not null default 0,
  delivery_charge  numeric(10,2) not null default 0,
  min_order_value  numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. PROFILES  (extends Supabase auth.users)
-- ============================================================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique,
  full_name   text,
  email       text,
  role        user_role not null default 'customer',
  city_id     uuid references cities(id),   -- staff: the city they operate in
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_city on profiles(city_id);

-- Auto-create a profile row whenever someone signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 4. RLS HELPER FUNCTIONS
--    security definer so they can read profiles without tripping RLS recursion
-- ============================================================================

create or replace function my_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function my_city()
returns uuid
language sql stable security definer set search_path = public
as $$ select city_id from profiles where id = auth.uid() $$;

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select my_role() in ('admin','city_manager','pickup_agent') $$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select my_role() = 'admin' $$;

-- ============================================================================
-- 5. ADDRESSES
-- ============================================================================

create table addresses (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  label        text,                      -- 'Home', 'Shop', 'Office'
  line1        text not null,
  line2        text,
  landmark     text,
  city_id      uuid not null references cities(id),
  pincode      text not null,
  lat          numeric(10,7),
  lng          numeric(10,7),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_addresses_profile on addresses(profile_id);

-- ============================================================================
-- 6. TAILORS
-- ============================================================================

create table tailors (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references profiles(id) on delete set null, -- null = no app login yet
  name           text not null,
  phone          text not null,
  shop_name      text,
  address        text,
  city_id        uuid not null references cities(id),
  specialities   text[] default '{}',     -- {'blouse','kurta','alteration'}
  daily_capacity int not null default 5,  -- garments per day
  commission_pct numeric(5,2) not null default 25.00,  -- Stitchera's cut
  rating         numeric(3,2) default 0,
  total_orders   int not null default 0,
  status         tailor_status not null default 'pending_verification',
  id_proof_url   text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_tailors_city   on tailors(city_id);
create index idx_tailors_status on tailors(status);

-- ============================================================================
-- 7. SERVICE CATALOG
--    Global catalogue + optional per-city price override.
-- ============================================================================

create table services (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  name_hi       text,
  category      text not null,            -- 'stitching' | 'alteration' | 'repair'
  garment_type  text not null,            -- 'kurta','blouse','shirt','trouser'...
  description   text,
  base_price    numeric(10,2) not null,
  est_days      int not null default 3,
  image_url     text,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table city_service_prices (
  city_id     uuid not null references cities(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  price       numeric(10,2) not null,
  is_active   boolean not null default true,
  primary key (city_id, service_id)
);

-- Effective price for a city (falls back to base_price)
create or replace function service_price(p_service uuid, p_city uuid)
returns numeric
language sql stable
as $$
  select coalesce(
    (select price from city_service_prices
      where service_id = p_service and city_id = p_city and is_active),
    (select base_price from services where id = p_service)
  );
$$;

-- ============================================================================
-- 8. MEASUREMENTS
--    This is your retention moat. Saved once, reused forever.
-- ============================================================================

create table measurements (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  label         text not null,            -- 'Papa kurta', 'My blouse'
  garment_type  text not null,
  person_name   text,                     -- measurements for family members
  values        jsonb not null default '{}',
  -- e.g. {"chest":40,"waist":34,"length":42,"sleeve":24,"shoulder":17,"unit":"inch"}
  taken_by      uuid references profiles(id),  -- pickup agent who recorded it
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_measurements_profile on measurements(profile_id);

-- ============================================================================
-- 9. ORDERS
-- ============================================================================

create sequence order_seq start 1001;

create table orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text unique not null,
  customer_id       uuid not null references profiles(id),
  city_id           uuid not null references cities(id),

  status            order_status not null default 'placed',

  -- address is SNAPSHOTTED, not referenced.
  -- Customer may edit/delete the address later; the order must not change.
  address_line      text not null,
  address_landmark  text,
  address_pincode   text not null,
  contact_phone     text not null,

  pickup_agent_id   uuid references profiles(id),
  pickup_slot_start timestamptz,
  pickup_slot_end   timestamptz,

  tailor_id         uuid references tailors(id),
  promised_date     date,

  delivery_agent_id uuid references profiles(id),

  -- money
  items_total       numeric(10,2) not null default 0,
  visit_charge      numeric(10,2) not null default 0,
  delivery_charge   numeric(10,2) not null default 0,
  discount          numeric(10,2) not null default 0,
  grand_total       numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,  -- Stitchera keeps
  tailor_payout     numeric(10,2) not null default 0,  -- tailor gets

  payment_status    payment_status not null default 'pending',
  payment_mode      payment_mode,

  customer_note     text,
  internal_note     text,
  cancel_reason     text,

  -- timeline
  placed_at         timestamptz not null default now(),
  picked_up_at      timestamptz,
  assigned_at       timestamptz,
  ready_at          timestamptz,
  delivered_at      timestamptz,
  updated_at        timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_status   on orders(status);
create index idx_orders_city     on orders(city_id, status);
create index idx_orders_tailor   on orders(tailor_id, status);
create index idx_orders_placed   on orders(placed_at desc);

-- STC-26-1001
create or replace function set_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null then
    new.order_number := 'STC-' || to_char(now(), 'YY') || '-' || nextval('order_seq');
  end if;
  return new;
end;
$$;

create trigger trg_order_number
  before insert on orders
  for each row execute function set_order_number();

create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  service_id      uuid not null references services(id),
  measurement_id  uuid references measurements(id),
  qty             int not null default 1 check (qty > 0),
  unit_price      numeric(10,2) not null,
  line_total      numeric(10,2) generated always as (unit_price * qty) stored,
  fabric_from     fabric_source not null default 'customer',
  item_note       text,
  created_at      timestamptz not null default now()
);

create index idx_order_items_order on order_items(order_id);

-- Audit trail. Save yourself from "customer says he never got it" arguments.
create table order_status_history (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  changed_by  uuid references profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_osh_order on order_status_history(order_id, created_at desc);

create or replace function log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  insert into order_status_history (order_id, from_status, to_status, changed_by)
  values (new.id,
          case when tg_op = 'UPDATE' then old.status else null end,
          new.status,
          auth.uid());
  return new;
end;
$$;

create trigger trg_log_status
  after insert or update of status on orders
  for each row execute function log_order_status();

-- ============================================================================
-- 10. PAYMENTS
-- ============================================================================

create table payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  amount         numeric(10,2) not null,
  mode           payment_mode not null,
  gateway_ref    text,                    -- Razorpay payment id
  collected_by   uuid references profiles(id),  -- for cash
  status         text not null default 'success',
  created_at     timestamptz not null default now()
);

create index idx_payments_order on payments(order_id);

create table tailor_payouts (
  id           uuid primary key default gen_random_uuid(),
  tailor_id    uuid not null references tailors(id),
  period_start date not null,
  period_end   date not null,
  order_count  int not null default 0,
  gross_amount numeric(10,2) not null default 0,
  commission   numeric(10,2) not null default 0,
  net_payable  numeric(10,2) not null default 0,
  paid_at      timestamptz,
  reference    text,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- 11. GENERIC updated_at TRIGGER
-- ============================================================================

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger t1 before update on profiles
  for each row execute function touch_updated_at();
create trigger t2 before update on tailors
  for each row execute function touch_updated_at();
create trigger t3 before update on measurements
  for each row execute function touch_updated_at();
create trigger t4 before update on orders
  for each row execute function touch_updated_at();

-- ============================================================================
-- 12. ROW LEVEL SECURITY
--     Without this, anyone with your public key reads every customer's data.
-- ============================================================================

alter table profiles            enable row level security;
alter table addresses           enable row level security;
alter table tailors             enable row level security;
alter table services            enable row level security;
alter table city_service_prices enable row level security;
alter table cities              enable row level security;
alter table measurements        enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_status_history enable row level security;
alter table payments            enable row level security;
alter table tailor_payouts      enable row level security;

-- Public catalogue: anyone may read
create policy "cities readable"   on cities   for select using (is_active or is_staff());
create policy "services readable" on services for select using (is_active or is_staff());
create policy "prices readable"   on city_service_prices for select using (true);

-- Profiles
create policy "own profile read"   on profiles for select using (id = auth.uid() or is_staff());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "admin manages profiles" on profiles for all using (is_admin());

-- Addresses
create policy "own addresses" on addresses for all
  using (profile_id = auth.uid() or is_staff())
  with check (profile_id = auth.uid() or is_staff());

-- Measurements
create policy "own measurements" on measurements for all
  using (profile_id = auth.uid() or is_staff())
  with check (profile_id = auth.uid() or is_staff());

-- Tailors: customers never see the tailor list
create policy "staff manage tailors" on tailors for all using (is_staff());
create policy "tailor sees self" on tailors for select using (profile_id = auth.uid());

-- Orders
create policy "customer sees own orders" on orders for select
  using (customer_id = auth.uid());

create policy "customer creates own orders" on orders for insert
  with check (customer_id = auth.uid());

create policy "tailor sees assigned orders" on orders for select
  using (tailor_id in (select id from tailors where profile_id = auth.uid()));

create policy "staff manage city orders" on orders for all
  using (is_admin() or (is_staff() and city_id = my_city()))
  with check (is_admin() or (is_staff() and city_id = my_city()));

-- Order items follow the parent order
create policy "order items follow order" on order_items for all
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or is_staff())))
  with check (exists (select 1 from orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or is_staff())));

create policy "history follow order" on order_status_history for select
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or is_staff())));

create policy "payments follow order" on payments for select
  using (exists (select 1 from orders o where o.id = order_id
                 and (o.customer_id = auth.uid() or is_staff())));
create policy "staff record payments" on payments for insert with check (is_staff());

create policy "admin payouts" on tailor_payouts for all using (is_admin());
create policy "tailor sees own payouts" on tailor_payouts for select
  using (tailor_id in (select id from tailors where profile_id = auth.uid()));

-- ============================================================================
-- 13. SEED — Kanpur
--     PRICES BELOW ARE PLACEHOLDERS.
--     Replace them with the real numbers from your 20 manual pilot orders.
-- ============================================================================

insert into cities (name, name_hi, state, is_active, visit_charge, delivery_charge, min_order_value)
values ('Kanpur', 'कानपुर', 'Uttar Pradesh', true, 0, 40, 199);

insert into services (slug, name, name_hi, category, garment_type, base_price, est_days, sort_order) values
  ('kurta-stitching',    'Kurta Stitching',      'कुर्ता सिलाई',       'stitching',  'kurta',    450, 4, 1),
  ('blouse-stitching',   'Blouse Stitching',     'ब्लाउज़ सिलाई',      'stitching',  'blouse',   400, 4, 2),
  ('suit-stitching',     'Salwar Suit Stitching','सलवार सूट सिलाई',   'stitching',  'suit',     650, 5, 3),
  ('shirt-stitching',    'Shirt Stitching',      'शर्ट सिलाई',        'stitching',  'shirt',    500, 5, 4),
  ('trouser-stitching',  'Trouser Stitching',    'पैंट सिलाई',        'stitching',  'trouser',  550, 5, 5),
  ('saree-fall-pico',    'Saree Fall & Pico',    'साड़ी फॉल-पीको',     'alteration', 'saree',    120, 2, 6),
  ('pant-hemming',       'Pant Hemming',         'पैंट हेमिंग',        'alteration', 'trouser',   80, 2, 7),
  ('size-alteration',    'Size Alteration',      'साइज़ अल्ट्रेशन',     'alteration', 'any',      150, 3, 8),
  ('zip-replacement',    'Zip Replacement',      'ज़िप बदलना',         'repair',     'any',      120, 2, 9),
  ('button-repair',      'Button & Hook Repair', 'बटन-हुक रिपेयर',    'repair',     'any',       60, 1, 10),
  ('school-uniform',     'School Uniform Set',   'स्कूल यूनिफ़ॉर्म',    'stitching',  'uniform',  400, 5, 11),
  ('lehenga-alteration', 'Lehenga Alteration',   'लहंगा अल्ट्रेशन',    'alteration', 'lehenga',  350, 5, 12);

-- ============================================================================
-- 14. AFTER RUNNING: make yourself admin
--   1. Sign up once through the app (or Supabase Auth dashboard)
--   2. Run:
--        update profiles
--        set role = 'admin',
--            city_id = (select id from cities where name = 'Kanpur')
--        where phone = '+91XXXXXXXXXX';
-- ============================================================================
