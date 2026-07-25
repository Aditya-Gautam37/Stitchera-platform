-- ============================================================================
-- STITCHERA — Demo data seed (NOT a schema migration, run manually once)
--
-- Run this in: Supabase Dashboard -> SQL Editor -> a NEW blank query tab
--
-- Creates 5 demo customers, 3 demo tailors, and 8 demo orders across a mix
-- of statuses so the admin dashboard looks like a live business instead of
-- an empty shell. Customer accounts are inserted directly into auth.users
-- (bypassing the Auth API entirely, so no confirmation emails are sent and
-- no rate limits apply) — this fires the same handle_new_user() trigger a
-- real signup would, so the resulting profiles rows are indistinguishable
-- from genuine ones. These demo accounts have real passwords set below in
-- case you ever want to log in as one, but nothing in this script depends
-- on that.
-- ============================================================================

-- 1. DEMO CUSTOMERS
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'rohit.sharma@example.com', crypt('DemoCustomer@2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Rohit Sharma"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'priya.verma@example.com', crypt('DemoCustomer@2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Verma"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'amit.singh@example.com', crypt('DemoCustomer@2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Amit Singh"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'sneha.gupta@example.com', crypt('DemoCustomer@2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sneha Gupta"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'vikram.yadav@example.com', crypt('DemoCustomer@2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Vikram Yadav"}', now(), now(), '', '');

-- Give them phone numbers too (profiles.phone is unique but nullable —
-- these are synthetic numbers, not real people's).
update profiles set phone = '+919000000001' where full_name = 'Rohit Sharma';
update profiles set phone = '+919000000002' where full_name = 'Priya Verma';
update profiles set phone = '+919000000003' where full_name = 'Amit Singh';
update profiles set phone = '+919000000004' where full_name = 'Sneha Gupta';
update profiles set phone = '+919000000005' where full_name = 'Vikram Yadav';

-- 2. DEMO TAILORS
insert into tailors (name, phone, shop_name, address, city_id, specialities, daily_capacity, commission_pct, status)
values
  ('Ramesh Kumar', '+919111111001', 'Ramesh Tailoring House', 'Nayaganj, Kanpur',
   (select id from cities where name = 'Kanpur'), array['kurta','shirt'], 6, 25, 'active'),
  ('Shalini Devi', '+919111111002', 'Shalini Stitches', 'Swaroop Nagar, Kanpur',
   (select id from cities where name = 'Kanpur'), array['blouse','suit'], 5, 25, 'active'),
  ('Kanpur Fashion Point', '+919111111003', 'Kanpur Fashion Point', 'Civil Lines, Kanpur',
   (select id from cities where name = 'Kanpur'), array['alteration','repair'], 8, 20, 'active');

-- 3. DEMO ORDERS (inserted directly with the status/timeline already set —
-- these bypass create_order() intentionally since they're backdated seed
-- data, not real bookings going through today's flow).
with demo_orders as (
  insert into orders (
    customer_id, city_id, status, address_line, address_pincode, contact_phone,
    tailor_id, items_total, visit_charge, delivery_charge, grand_total,
    payment_status, placed_at, delivered_at
  ) values
    ((select id from profiles where full_name = 'Rohit Sharma'),
     (select id from cities where name = 'Kanpur'), 'delivered',
     '12 MG Road', '208001', '+919000000001',
     (select id from tailors where name = 'Ramesh Kumar'),
     900, 0, 40, 940, 'paid', now() - interval '6 days', now() - interval '2 days'),

    ((select id from profiles where full_name = 'Priya Verma'),
     (select id from cities where name = 'Kanpur'), 'with_tailor',
     '45 Mall Road', '208001', '+919000000002',
     (select id from tailors where name = 'Shalini Devi'),
     400, 0, 40, 440, 'pending', now() - interval '3 days', null),

    ((select id from profiles where full_name = 'Amit Singh'),
     (select id from cities where name = 'Kanpur'), 'confirmed',
     '78 Kakadeo', '208025', '+919000000003',
     null, 1500, 0, 40, 1540, 'pending', now() - interval '1 day', null),

    ((select id from profiles where full_name = 'Sneha Gupta'),
     (select id from cities where name = 'Kanpur'), 'ready',
     '23 Kidwai Nagar', '208011', '+919000000004',
     (select id from tailors where name = 'Ramesh Kumar'),
     650, 0, 40, 690, 'pending', now() - interval '4 days', null),

    ((select id from profiles where full_name = 'Vikram Yadav'),
     (select id from cities where name = 'Kanpur'), 'placed',
     '9 Govind Nagar', '208006', '+919000000005',
     null, 160, 0, 40, 200, 'pending', now(), null),

    ((select id from profiles where full_name = 'Rohit Sharma'),
     (select id from cities where name = 'Kanpur'), 'out_for_delivery',
     '12 MG Road', '208001', '+919000000001',
     (select id from tailors where name = 'Shalini Devi'),
     150, 0, 40, 190, 'paid', now() - interval '2 days', null),

    ((select id from profiles where full_name = 'Priya Verma'),
     (select id from cities where name = 'Kanpur'), 'cancelled',
     '45 Mall Road', '208001', '+919000000002',
     null, 120, 0, 40, 160, 'pending', now() - interval '5 days', null),

    ((select id from profiles where full_name = 'Amit Singh'),
     (select id from cities where name = 'Kanpur'), 'delivered',
     '78 Kakadeo', '208025', '+919000000003',
     (select id from tailors where name = 'Kanpur Fashion Point'),
     240, 0, 40, 280, 'paid', now() - interval '7 days', now() - interval '3 days')
  returning id, customer_id, grand_total
)
insert into order_items (order_id, service_id, qty, unit_price)
select o.id, s.id, i.qty, s.base_price
from demo_orders o
join lateral (
  values
    (900::numeric, 'kurta-stitching', 2),
    (400::numeric, 'blouse-stitching', 1),
    (1500::numeric, 'shirt-stitching', 3),
    (650::numeric, 'suit-stitching', 1),
    (160::numeric, 'pant-hemming', 2),
    (150::numeric, 'size-alteration', 1),
    (120::numeric, 'zip-replacement', 1),
    (240::numeric, 'button-repair', 4)
) as i(items_total, slug, qty) on i.items_total = o.grand_total - 40
join services s on s.slug = i.slug;
