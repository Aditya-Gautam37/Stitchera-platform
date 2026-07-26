# Stitchera Production Audit — 2026-07-26

## Step 1 — Ground Truth

### Stack
- Next.js **16.2.11** (App Router, Turbopack, `proxy.ts` — confirmed no stale `middleware.ts` exists alongside it)
- React **19.2.4**
- `@supabase/ssr` **^0.12.3**, `@supabase/supabase-js` **^2.110.8**
- Tailwind **v4**, TypeScript **^5**
- No test framework, no CI config, no Sentry/logging SDK in `package.json` — nothing beyond the five runtime deps above and standard tooling.

### Routes (44 pages + 1 API route)
All 44 `page.tsx` files are **Server Components** (none has `"use client"` at the top). Client-side interactivity is isolated to 8 files: `app/login/login-form.tsx`, `app/reset-password/reset-password-form.tsx`, `app/(staff)/admin/chat/[id]/close-thread-button.tsx`, `components/chat/chat-window.tsx`, `components/site/account-menu.tsx`, `components/submit-button.tsx`, `app/error.tsx`, `app/global-error.tsx`. This is a clean split — no findings here.

Route groups: `(site)` public marketing/info, `(customer)` authenticated customer app, `(staff)/admin` staff/admin panel, `(tailor)/tailor` tailor dashboard, plus standalone `login`, `onboarding`, `reset-password`.

### Database — 18 tables across 13 migrations (0001–0013)
`cities, profiles, addresses, tailors, services, city_service_prices, measurements, orders, order_items, order_status_history, payments, tailor_payouts, reviews, partner_applications, customer_subscriptions, subscription_plans, chat_threads, chat_messages`. One view: `public_tailors`.

58 `create policy` statements exist across the migration history; several are dropped and re-created with a tightened definition in a later migration (this is the project's own documented hardening pattern — each such file explains what it's replacing and why). The **current, active** policy set was read in full for this audit, not just the count.

RPC functions (all `SECURITY DEFINER` unless noted): `create_order` (0010's version is authoritative — a later migration doesn't redefine it), `record_payment` (SECURITY INVOKER), `purchase_subscription`, `track_order`, `get_or_create_chat_thread`, `has_active_subscription`, `service_price` (SQL, invoker), `order_stats`/`revenue_stats` (SQL, invoker). Helper functions `my_role`/`my_city`/`is_staff`/`is_admin` are SECURITY DEFINER to avoid RLS recursion on `profiles`.

### Feature completeness
| Feature | Status |
|---|---|
| Customer registration (auto-profile on signup) | Built |
| Phone OTP login | Built |
| Email/password login + password reset | Built |
| Self-serve tailor/delivery-partner registration | Built (staff approval required, never automatic) |
| Booking / checkout | Built (server-priced, single RPC, handling+surge+delivery charges, 3-free-booking cap) |
| Measurements (save & reuse) | Built |
| Order tracking (authenticated) | Built |
| Order tracking (guest, order number + phone) | Built |
| Admin board (orders/customers/tailors/cities/services/staff/applications/subscriptions/chat) | Built |
| Tailor assignment to an order | Built (admin manual assignment) |
| Tailor self-service dashboard (mark ready, view payouts) | Built |
| Payment recording (staff-confirmed) | Built |
| Reviews & ratings | Built |
| Live chat (customer ↔ staff) | Built (Supabase Realtime) |
| AI Assistance | Built, but as rule-based catalog finders — see Not Implemented |
| Subscription purchase | Built (no real payment, stub as designed) |

## Top 5 Blockers

1. ✅ **FIXED** — see `## Fixed`. A customer could pull a tailor's phone number, commission rate, internal staff notes, and government ID document link straight from the REST API, not just their name.
2. ✅ **FIXED** — see `## Fixed`. Two rapid taps of "Confirm booking" on bad 4G could create two real, separately-charged orders.
3. ✅ **FIXED (mechanism only)** — see `## Fixed`. No privacy policy, no consent capture, and no account/data-deletion path, while the app collects home addresses, phone numbers, and body measurements.
4. ✅ **FIXED** — see `## Fixed`. `record_payment()` never checked the order's status; a cancelled order could be marked paid.
5. **The README is the unedited `create-next-app` boilerplate** — no Supabase setup, no migration order, no env vars, wrong font name. A second developer (or you, on a new machine) cannot get this running from it. `README.md:1-33`

## Fixed

Verified against a real Postgres 16 instance (Docker), all 17 migrations applied, seeded with a real customer/tailor/pickup-agent/order fixture — not just re-reading the SQL. Full proof transcripts for each item are in this conversation; summarized below.

### 1. Full-row RLS exposure on three "see my assigned provider" policies
- **What changed**: `supabase/migrations/0014_rls_scope_narrowing.sql` (new). Added `my_tailor_id()` (SECURITY DEFINER, same reasoning as the pre-existing `is_staff()`/`my_role()`). Rewrote `"tailor sees assigned orders"`, `"tailor updates own assigned order"`, `"tailor sees assigned order items"`, and `"tailor sees measurements on assigned orders"` to key off `my_tailor_id()` instead of a raw subquery into `tailors`. Dropped `"customer sees assigned tailor"` and `"customer sees assigned pickup agent"` entirely, replaced with two name-only views (`customer_assigned_tailors`, `customer_assigned_pickup_agents`) using the same non-`security_invoker` pattern as the existing `public_tailors` view. Updated `app/(customer)/orders/[id]/page.tsx:26-53` to query the new views instead of embedding the base tables (PostgREST can't embed through a view).
- **Bigger than it looked**: investigating this surfaced a live production bug beyond the over-exposure — `"customer sees assigned tailor"` and `"tailor sees assigned orders"` referenced each other in a raw subquery, which is a structural cycle Postgres's RLS rewriter can't resolve. Confirmed this was throwing `infinite recursion detected in policy` on every query against `tailors` (admin tailor pages, a tailor's own login gate), the customer order-detail page, the tailor's "what to stitch" view, and — most seriously — the tailor's "mark ready" UPDATE itself, since the UPDATE policy had the identical recursive subquery. The fix for the exposure issue also fixes this.
- **Verified**: customer's direct `SELECT` on the tailor's `phone`/`commission_pct`/`notes`/`id_proof_url` → 0 rows (was previously unreachable at all, due to the recursion error, prior to any fix). Customer's direct `SELECT` on the pickup agent's `phone`/`email` → 0 rows. The app's actual `orders join tailors` query pattern, as the customer → succeeds (previously `ERROR: infinite recursion detected in policy`). Tailor reading their own order's line items → succeeds (previously the same recursion error). Tailor's mark-ready `UPDATE ... RETURNING` → succeeds and persists (previously the same recursion error). Staff listing tailors → succeeds (previously the same recursion error, for every role).
- **Deliberately not fully closed**: the tailor still has full-row `SELECT` on `orders` (including `address_line`/`address_landmark`), just recursion-fixed. See Follow-ups below.

### 2. Double-submit on booking can create duplicate real orders
- **What changed**: `supabase/migrations/0016_booking_idempotency.sql` (new) — added `orders.idempotency_key`, a unique index on `(customer_id, idempotency_key)`, and extended `create_order()` to check-and-return an existing order for a repeated key before any other validation runs, with a `unique_violation` catch for a genuine simultaneous race. `app/(customer)/book/page.tsx` generates one `crypto.randomUUID()` per page render (Server Component, no client JS) and embeds it as a hidden field; `app/(customer)/book/actions.ts` forwards it.
- **Verified**: called `create_order()` twice sequentially with the same key → both calls returned the identical order id, exactly 1 row exists. Then ran a genuine concurrency test — two separate `psql` connections launched as actual background OS processes, synchronized with `pg_sleep` to force a real race at the unique index — both still returned the identical order id, exactly 1 row exists. This exercises the `unique_violation` exception handler specifically, not just the simpler sequential path.

### 3. No privacy policy, consent capture, or deletion path (DPDP-relevant) — mechanism only
- **What changed**: `supabase/migrations/0017_consent_and_deletion.sql` (new) — added `profiles.consent_given_at`/`consent_version`, and a `deletion_requests` table (customer can insert/read own; admin-only for triage, matching the existing admin-only pattern for subscription grants). `app/onboarding/actions.ts` + `app/onboarding/page.tsx` — onboarding (the one mandatory step every new signup passes through, regardless of phone-OTP or email path) now requires a consent checkbox and records `consent_given_at`/`consent_version` alongside the name. `app/(site)/privacy/page.tsx` (new) — plain-language draft, visibly marked "DRAFT — pending legal review" in a banner and a code comment; not reviewed legal text. `app/(customer)/dashboard/actions.ts` + `page.tsx` — a "Request account deletion" form with an optional reason, showing a pending-confirmation message once submitted. `app/(staff)/admin/deletion-requests/{page,actions}.tsx` (new) — admin-only list with "Mark actioned"/"Dismiss", added to the admin nav.
- **Verified**: consent write (`update profiles set consent_given_at = now(), consent_version = ...`) → `consent_given_at is not null` = true, correct version stored. Customer inserts a deletion request → readable back by that same customer (`status: pending`, reason preserved). A *different* customer querying the same request → 0 rows. A non-admin staff role (`pickup_agent`) querying deletion requests at all → 0 rows (admin-only, as designed). After promoting to admin → the request is visible joined with the customer's name, and the "mark actioned" `UPDATE` succeeds and persists.
- **Explicitly not built** (per the brief — mechanism, not legal review or automated erasure): the `/privacy` text is a marked draft, and there is no automated pipeline that actually deletes a profile's data across every referencing table — an admin actions a request manually, which is the intended pilot-scale process for now.

### 4. `record_payment()` doesn't check order status
- **What changed**: `supabase/migrations/0015_payment_status_guard.sql` (new, re-defines the existing function) — fetches `orders.status` alongside `grand_total` and rejects with `'Cannot record a payment against a cancelled order'` if cancelled. The "already fully paid" case needed no change — the pre-existing overcollection check already rejects any further payment once the running total reaches `grand_total`.
- **Verified**: `record_payment()` against the seeded cancelled order → before the fix, succeeded (returned a payment id, proving the bug); after the fix, `ERROR: Cannot record a payment against a cancelled order`. Control call against a normal, non-cancelled order → still succeeds, no regression. No app changes were needed — the function's default `P0001` error code is already surfaced verbatim by the existing `recordPayment()` action.

## Follow-ups noticed while fixing

- **Tailor still has full-row `SELECT` on `orders`** (address_line/address_landmark included), per item 1 above. Recursion-fixed, but not narrowed, because dropping that policy breaks `UPDATE ... RETURNING` for the mark-ready action (confirmed by testing: Postgres requires SELECT-policy visibility to return an updated row, even when the UPDATE policy itself permits the write). Closing this needs `markOrderReady` reworked to confirm success via row-count instead of a returned row — more surface area than "narrow this policy," and out of scope for this pass.
- **`addresses` table RLS gap** (AUDIT.md MEDIUM #1, pre-existing, unrelated to the 4 items fixed here) — still open, still low-impact since the table is never written to by any app code.
- **No automated tests on `create_order()`/`record_payment()`** (AUDIT.md MEDIUM #2) — the manual Postgres-container verification used for this pass would make a good starting point for that, but wasn't turned into a persisted test suite since that wasn't asked for here.
- **`compute_order_split()` doesn't fire on status change** (AUDIT.md LOW #4) — noticed again while working on item 4; still just cosmetic today per the original audit's reasoning, left as-is.

## HIGH — must fix before launch

### 1. README doesn't describe this project
- **Location**: `README.md:1-33`
- **Problem**: Verbatim `create-next-app` boilerplate — references "Geist" font (not used here; this project uses Bricolage Grotesque/Public Sans/IBM Plex Mono), has no mention of Supabase, no migration-order instructions, no required env vars.
- **Impact**: You cannot recover from a lost dev machine, and I cannot verify "can a new developer run this" against anything real — the answer today is no.
- **Fix**: Document: the two required env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, per `.env.example`), that migrations 0001–0017 must run in order in fresh SQL Editor tabs, and the actual font/design-system stack.
- **Effort**: 1hr

### 2. Zero order-status-change or SMS/email notifications to the customer
- **Location**: no notification code exists anywhere in `app/` or `lib/` (confirmed by search — the only outbound communication is Supabase's own OTP SMS and signup confirmation email)
- **Problem**: When staff moves an order from `placed` → `confirmed` → `picked_up` → ... → `delivered`, the customer is told nothing. They only find out by opening the app and checking My Orders.
- **Impact**: For a home-visit service where a stranger is coming to someone's house, "nobody told me the pickup agent is on the way" is a trust problem, not just a UX nicety — and it will generate support calls you don't have staff to answer yet.
- **Fix**: At minimum, an SMS on `confirmed` (visit is happening) and `delivered`. This is a real integration project (SMS provider + DLT registration, see Needs Verification below), not a quick patch.
- **Effort**: multi-day

## MEDIUM — fix within first month of operating

### 1. `addresses` table has a cross-city RLS gap, but the table is dead
- **Location**: `supabase/migrations/0001_init.sql:439-441`
- **Problem**: `"own addresses"` is `profile_id = auth.uid() or is_staff()` — no city scoping, unlike the identical pattern that was fixed for `orders`/`order_items`/`payments`/`tailors`/`profiles` in `0004_adversarial_hardening.sql` and for `measurements` in `0006_measurements.sql`. This one was missed.
- **Impact**: Today, zero — I searched the entire app and `addresses` is only ever read once (`app/(staff)/admin/customers/[id]/page.tsx:50-51`) and **never written to anywhere**. The table is schema-only; nothing populates it (orders snapshot the address directly onto the `orders` row instead). If a "saved addresses" feature is ever built on this table, a city_manager in Lucknow would be able to read and write a Kanpur customer's home address.
- **Fix**: Apply the same fix pattern as `measurements`: `is_admin() or (is_staff() and exists (select 1 from orders o where o.customer_id = addresses.profile_id and o.city_id = my_city()))`.
- **Effort**: 15min

### 2. No automated tests on the money-math functions
- **Location**: no test files exist anywhere in the repo (confirmed by search); `create_order()`, `record_payment()`, `compute_order_split()` have zero regression coverage
- **Problem**: The pricing/commission logic lives entirely in PL/pgSQL functions with no automated way to verify a future edit didn't change the numbers.
- **Impact**: A future "quick fix" to `create_order()` or the commission trigger could silently change what customers are charged or what tailors are owed, and nothing would catch it before a real order does.
- **Fix**: At minimum, a handful of `pgTAP` or plain SQL assertion tests for `create_order()`'s charge math and `compute_order_split()`'s commission split, run manually before any migration touching these functions ships.
- **Effort**: half-day

### 3. No loading UI on 43 of 44 routes
- **Location**: only `app/(site)/services/loading.tsx` exists; every other route (`book`, `dashboard`, `orders`, all of `(staff)/admin/*`, all of `(tailor)/*`) has no `loading.tsx`
- **Problem**: Next.js shows nothing (the previous page stays frozen, then snaps to the new one) while a Server Component's data fetch is in flight, unless a `loading.tsx` boundary exists for that route segment.
- **Impact**: On the patchy 4G this app is explicitly designed for, navigating to `/book` or `/orders` can hang with no feedback for a couple of seconds — indistinguishable from the app being broken.
- **Fix**: Add a `loading.tsx` per route group at minimum (one in `(customer)`, one in `(staff)/admin`, one in `(tailor)`) with a simple skeleton, rather than one per page.
- **Effort**: half-day

### 4. Registration fee is client-trusted (but not connected to real money)
- **Location**: `supabase/migrations/0009_partner_applications.sql:65-66` (`"applicant creates own application" with check (profile_id = auth.uid())` — no check on `registration_fee`)
- **Problem**: The Server Action hardcodes the correct fee (`lib/actions/partner-applications.ts:43,77`), but nothing stops a direct API call from inserting a `partner_applications` row with `registration_fee: 0` or any other value.
- **Impact**: Low today — per the payment-stub design, `fee_paid` is a manual staff toggle with no real payment ever collected through the app, so a tampered value would only mislead a staff member glancing at the number, not move real money.
- **Fix**: A `CHECK` constraint or a small `SECURITY DEFINER` insert function that sets the fee server-side from `applicant_type`, matching the pattern already used for `create_order()`.
- **Effort**: 1hr

### 5. No error monitoring or alerting
- **Location**: every server action's failure path is a `console.error(...)` (e.g. `app/(customer)/book/actions.ts:65`, and the same pattern repeats across every action file) with no aggregation
- **Problem**: `console.error` in a Vercel serverless function goes to that function's log, visible only if someone manually opens the Vercel dashboard and looks.
- **Impact**: As a solo founder with no on-call rotation, a real production error (e.g., Supabase briefly unreachable during a booking) produces no alert — you find out when a customer complains, not before.
- **Fix**: Wire up a free-tier error tracker (Sentry's free tier is enough at this volume) so a real error at least reaches an email/Slack notification instead of a silent log line.
- **Effort**: half-day

## LOW — quality of life

### 1. `npm audit` flags 3 high-severity transitive vulnerabilities, all inside Next.js's own bundled build tooling
- **Location**: `postcss` and `sharp`, both pulled in transitively by `next@16.2.11`'s own `node_modules/next/node_modules/*`
- **Problem**: `npm audit fix --force` would downgrade to `next@9.3.3` — clearly wrong, these are build-time tools (CSS processing, image optimization) bundled inside Next.js itself, not exploitable via end-user input on the live site.
- **Fix**: No action now; re-run `npm audit --production` after the next Next.js version bump and re-evaluate.
- **Effort**: 15min (just tracking it)

### 2. `record_payment`/`purchase_subscription` are executable by customers (harmlessly)
- **Location**: `supabase/migrations/0005_payments.sql:161-162`, `supabase/migrations/0011_subscription_purchase.sql:112-113` — both `grant execute ... to authenticated`, not staff-restricted
- **Problem**: A customer calling `record_payment()` against their own order will always fail at the RLS `INSERT` step on `payments` (staff-only policy) — verified by tracing the policy at `supabase/migrations/0005_payments.sql:39-43`. No exploit path exists today.
- **Fix**: Purely defense-in-depth — could add an explicit `if not is_staff() then raise exception` at the top for a clearer failure mode, but not urgent.
- **Effort**: 15min

### 3. `track_order()` has no rate limiting of its own
- **Location**: `supabase/migrations/0007_public_order_tracking.sql:17-32`, `grant execute ... to anon`
- **Problem**: No app-level throttle on this anonymous RPC beyond whatever Supabase's platform-level PostgREST rate limits provide.
- **Impact**: Low — matching requires guessing both an exact order number AND an exact phone number simultaneously, and the function only ever returns `order_number, status` (no address, no financial data) even on a hit.
- **Fix**: Not urgent at this volume; revisit if abuse is ever observed.
- **Effort**: n/a — informational

### 4. Commission/payout columns go stale on cancellation, but nothing currently sums them
- **Location**: `supabase/migrations/0005_payments.sql:55-82` (`compute_order_split()` fires on `tailor_id`/`items_total` change, never on `status` change)
- **Problem**: If a tailor is assigned, then the order is cancelled, `orders.commission_amount`/`tailor_payout` still show what they would have been — cancellation doesn't zero them out.
- **Impact**: Cosmetic today — the only place these columns are displayed is the single order's own detail page (`app/(staff)/admin/orders/[id]/page.tsx:169,173`); nothing aggregates them across orders, and `tailor_payouts` (the actual payout ledger table) is populated manually, not by summing these columns.
- **Fix**: Have `compute_order_split()` also fire on `status`, zeroing both columns when status becomes `cancelled`.
- **Effort**: 15min

## Not Implemented (features absent by design or otherwise)

- Real payment gateway / actual online money movement — deliberately stubbed; all collection is staff-confirmed cash/UPI recorded after the fact.
- SMS/email/push notifications on order status change.
- File upload for tailor ID proof or garment photos — `tailors.id_proof_url` column exists, no Storage bucket or upload UI wired to it.
- Admin UI to create a `tailor_payouts` row — the table and the tailor-facing read view exist; nothing writes to it except a manual SQL insert.
- Dedicated delivery-partner app/dashboard — delivery partners are `profiles.role = 'pickup_agent'` and use the same staff/admin panel with a reduced nav, not a separate experience.
- Franchise / multi-city City Office panel, state-wise reporting — out of scope for the Kanpur pilot by explicit prior decision.
- "Know Your Body Type" AI hologram scan and the AI cross-e-commerce matching engine — replaced with rule-based catalog finders under the same "AI Assistance" nav label, by explicit prior decision.
- Automated erasure pipeline — the deletion-request path (see `## Fixed`) is request-and-triage, not automated deletion across every table that references `profiles.id`.
- Reviewed privacy policy text — `/privacy` exists but is explicitly marked DRAFT pending legal review.
- Automated test suite of any kind.

## Needs Verification (I couldn't confirm from code alone)

- **Supabase project's OTP/SMS rate limits**: the app's own 30-second resend cooldown (`app/login/login-form.tsx:10`) is a client-side UI throttle only — it doesn't stop a direct call to `signInWithOtp`. Check *Supabase Dashboard → Authentication → Rate Limits* for the actual server-side throttle on SMS OTP sends per phone/IP.
- **DLT registration for transactional SMS**: Supabase's phone-auth OTP SMS is routed through whatever SMS provider is configured in *Supabase Dashboard → Authentication → Providers → Phone*. Confirm that provider's DLT (India's mandatory sender-ID/template registration) is actually completed — without it, OTP SMS silently won't deliver to Indian numbers.
- **Database backup plan**: run `Supabase Dashboard → Settings → Database → Backups` and confirm the current plan tier's retention (free tier has no point-in-time recovery, only what you export yourself).
- **Actual index usage under real query patterns**: I could not run `EXPLAIN ANALYZE` — this environment has no `psql`/Supabase CLI/database connection. The indexes I found in the migrations (`idx_orders_status`, `idx_orders_city`, `idx_orders_tailor`, `idx_orders_customer_placed`, etc.) look like the right ones for the queries the app runs, but confirm with:
  ```sql
  explain analyze select * from orders where city_id = '<a real city id>' and status = 'placed' order by placed_at desc limit 50;
  explain analyze select * from orders where customer_id = '<a real customer id>' order by placed_at desc;
  ```
- **Environment variable parity between local/preview/production on Vercel**: confirm both `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly per-environment in the Vercel dashboard, and that no Preview deployment accidentally points at production data.

## Later, Not Now (real, but only matters above ~1,000 users)

- `app/(staff)/admin/customers/page.tsx:54-66` merges two `.ilike()` result sets in JS and slices to 100 — fine at current volume, would need real full-text search or a combined SQL query at higher customer counts.
- No connection pooling configuration mentioned anywhere (Supabase's pooler defaults are more than sufficient at 20–200 orders/month).
- No CDN/caching strategy beyond Next.js/Vercel defaults — irrelevant at this traffic level.
- No pagination on a few staff list views beyond a flat `.limit(100)` — fine until a single city has more than 100 customers/tailors to page through in one screen.

## Verdict

**Not yet — but it's close, and nothing on this list is architecturally hard.** The core transaction path (pricing, order creation, payment recording, RLS row-ownership) is genuinely well-built: money is computed in exactly one place, order creation is atomic, the payments ledger is append-only, and the mass-assignment/privilege-escalation classes of bug that usually sink a first launch were already found and fixed in earlier hardening passes. What's actually blocking a real launch is narrower than the codebase's size suggests: the full-row RLS exposure on assigned-provider policies (Blocker #1) and the double-submit gap (Blocker #2) are both concrete, both fixable in well under a day combined, and both directly match this audit's stated bar (leaks PII, could cost you money). The DPDP gap (Blocker #3) and the missing README (Blocker #5) aren't code risks so much as they're things a real launch shouldn't go out without. Fix the two RLS policies, add the idempotency key, add a privacy-policy page with a consent checkbox, and you're in a defensible place to take real Kanpur customers — the rest of this document is a first-month and later-stage punch list, not a gate.
